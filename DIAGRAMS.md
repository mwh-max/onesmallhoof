# One Small Hoof — Data Flow Diagrams

---

## 1. System Architecture

```mermaid
graph TD
    Browser["Browser / PWA"]
    LS["localStorage"]
    SW["Service Worker\n(cache-first)"]
    SB["Supabase\n(auth + user_data table)"]
    RS["Resend\n(magic link emails)"]

    Browser -->|reads/writes| LS
    Browser -->|asset requests| SW
    Browser <-->|auth + data API| SB
    SB -->|sends email via| RS
    RS -->|magic link| Browser
```

---

## 2. Auth & Session Flow

```mermaid
flowchart TD
    A([Page Load]) --> B[getSession]
    B -->|session exists| C[showSignedIn]
    B -->|no session| D[showSignedOut]

    E[User enters email\nand submits] --> F[signInWithOtp]
    F --> G[Resend sends magic link]
    G --> H[User clicks link in email]
    H --> I[Redirect to onesmallhoof.com]
    I --> J[onAuthStateChange fires]
    J -->|session| C

    C --> C1[Hide form + intro]
    C --> C2[Show email + buttons]
    C --> C3[Set data-authed=true]
    C --> C4[syncDown]

    D --> D1[Show form + intro]
    D --> D2[Hide email + buttons]
    D --> D3[Set data-authed=false]
    D --> D4[Disable custom task input]
```

---

## 3. Sign-out & Account Deletion

```mermaid
flowchart TD
    A([Sign out click]) --> B[db.auth.signOut]
    B -->|success| C[resetApp]
    C --> D[Clear localStorage]
    C --> E[Reset all UI elements]
    B --> F[showSignedOut]

    G([Delete account click]) --> H[window.confirm]
    H -->|cancelled| I([Done])
    H -->|confirmed| J[db.rpc delete_user_account]
    J --> K["Postgres SECURITY DEFINER fn:\nDELETE FROM user_data\nDELETE FROM auth.users"]
    K -->|success| C
    K --> L[db.auth.signOut]
    L --> F

    subgraph resetApp
        D
        E
    end
```

---

## 4. Data Sync Flow

```mermaid
flowchart TD
    A([syncDown]) --> B[Get current user]
    B -->|not signed in| Z([Return])
    B -->|signed in| C[Fetch user_data row from Supabase]
    C -->|no row| D[syncUp instead]
    C -->|row found| E[Merge cloud → local]

    E --> E1["ecoAction:\nkeep whichever has higher streak"]
    E --> E2["ecoHistory:\nmerge by date, deduplicate, keep last 30"]
    E --> E3["longestStreak:\ntake max of local and cloud"]
    E --> E4["actionCount:\ncloud wins only if same day and higher"]
    E --> E5["customTasks:\nmerge deduplicated by task + date"]

    E1 & E2 & E3 & E4 & E5 --> F[Write merged data to localStorage]
    F --> G[Dispatch syncdown-complete event]
    G --> H[refreshAfterSync updates UI]

    I([syncUp]) --> J[Get current user]
    J -->|not signed in| Z
    J -->|signed in| K[Read all keys from localStorage]
    K --> L[Upsert to user_data table]
```

---

## 5. Eco Action Flow

```mermaid
flowchart TD
    A([Page load]) --> B[Read selectedCategory\nfrom localStorage]
    B --> C[Render action list for category]

    D([Category button click]) --> E{Signed in?}
    E -->|No| N[showNudge]
    E -->|Yes| F[Save selectedCategory to localStorage]
    F --> C

    G([Action item click]) --> H{Signed in?}
    H -->|No| N
    H -->|Yes| I[calculateStreak\nagainst yesterday's date]
    I --> J[Save ecoAction to localStorage\naction + date + streak]
    J --> K[Append to ecoHistory\nmax 30 entries]
    K --> L{New personal best?}
    L -->|Yes| M[Save longestStreak]
    L -->|No| O
    M --> O[updateStreakDisplay + renderStreakDots]
    O --> P[syncUp]
    P --> Q{Streak is milestone?\n3 / 7 / 14 / 30}
    Q -->|Yes| R[showShareCard]
    Q -->|No| S([Done])
```

---

## 6. Custom Tasks & Action Counter

```mermaid
flowchart TD
    A([Enter key in\ncustom task input]) --> B{Signed in?}
    B -->|No| N[showNudge]
    B -->|Yes| C[CustomTaskManager.add]
    C --> D[Append to customTasks in localStorage]
    D --> E[Render in userTaskList]
    E --> F[syncUp]

    G([Add Your Action click]) --> H{Signed in?}
    H -->|No| N
    H -->|Yes| I{Eco-action\nlogged today?}
    I -->|No| J[Show pick eco-action first message]
    I -->|Yes| K[Increment actionCount in localStorage]
    K --> L[Update count display]
    L --> F
```

---

## 7. Onboarding & Sign-in Nudge

```mermaid
flowchart TD
    A([Signed-out user\nloads page]) --> B[data-authed=false\non main-content]
    B --> C[CSS dims action list,\ncategory nav, counter, task input]
    B --> D[customTask input disabled]
    B --> E[Sign-in intro visible\nabove form]

    F([User clicks action /\ncategory / counter /\ncustom task Enter]) --> G{Signed in?}
    G -->|Yes| H[Normal action proceeds]
    G -->|No| I[showNudge]
    I --> J["Render: 'sign in to save your streak'\nwith anchor link"]
    J --> K[Show nudge, auto-hide after 4s]
    K --> L{User clicks sign-in link?}
    L -->|Yes| M[Smooth scroll to\nsign-in section]
    L -->|No| N[Nudge fades]
```

---

## 8. Milestone Share Card

```mermaid
flowchart TD
    A([Milestone streak reached]) --> B[showShareCard]
    B --> C[Set streak text\nand milestone message]
    C --> D[Show overlay\nFocus share button]
    D --> E[Add Escape keydown listener]

    F([Share button click]) --> G{navigator.share\navailable?}
    G -->|Yes - mobile| H[Web Share API\ntext + URL]
    G -->|No - desktop| I[Copy text + URL\nto clipboard]
    I --> J[Show copied! for 2s\nthen restore share label]

    K([Dismiss button click]) --> L[Hide overlay]
    L --> M[Remove Escape listener]
    N([Escape key]) --> L
```

---

## 9. Daily Notification Flow

```mermaid
flowchart TD
    A([remind me daily click]) --> B{Permission\nalready denied?}
    B -->|Yes| Z([Return])
    B -->|No| C{Currently\nopted in?}
    C -->|Yes| D[Set reminderOptIn=false\nUpdate button label]
    C -->|No| E[Request Notification permission]
    E -->|Granted| F[Set reminderOptIn=true\nUpdate button label]
    E -->|Denied| Z

    G([Page load]) --> H{Opted in\nand permission granted?}
    H -->|No| Z
    H -->|Yes| I{Eco-action\nlogged today?}
    I -->|Yes| Z
    I -->|No| J{Notification\nalready shown today?}
    J -->|Yes| Z
    J -->|No| K[Wait 5 seconds]
    K --> L[Show browser notification]
    L --> M[Set notificationShownDate\nin localStorage]
```
