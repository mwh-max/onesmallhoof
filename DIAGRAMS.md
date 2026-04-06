# One Small Hoof — Data Flow Diagrams

---

## 1. System Architecture

```mermaid
graph TD
    Browser["Browser / PWA"]
    LS["localStorage"]
    SW["Service Worker\n(cache-first)\ncaches: lib.js, script.js,\nauth.js, sync.js,\nsupabase-client.js + assets"]
    SB["Supabase\n(auth + user_data table)"]
    RS["Resend\n(magic link emails)"]
    LIB["lib.js\n(parseJSON, calculateStreak,\nisMilestone — pure logic)"]

    Browser -->|reads/writes| LS
    Browser -->|asset requests| SW
    Browser <-->|auth + data API| SB
    SB -->|sends email via| RS
    RS -->|magic link| Browser
    LIB -->|window globals| Browser
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
    J -->|event=SIGNED_IN| T[triggerToast\n"You're signed in. Start your streak!"]

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

    E --> E1["lib.js: mergeEcoAction\nkeep whichever has higher streak"]
    E --> E2["lib.js: mergeEcoHistory\nmerge by date, deduplicate, keep last 30"]
    E --> E3["lib.js: mergeLongestStreak\ntake max of local and cloud"]
    E --> E4["lib.js: mergeActionCount\ncloud wins only if same day and higher"]
    E --> E5["lib.js: mergeCustomTasks\nmerge deduplicated by task + date"]

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
    B --> C[Render action list for category\ninside #action-selector]

    D([Category button click\n#category-nav]) --> E{Signed in?}
    E -->|No| N[showNudge]
    E -->|Yes| F[Save selectedCategory to localStorage]
    F --> C

    G([Action item click\n#action-list]) --> H{Signed in?}
    H -->|No| N
    H -->|Yes| I["lib.js: calculateStreak\npreserves streak if same day,\nincrements if yesterday,\nresets to 1 otherwise"]
    I --> J[Save ecoAction to localStorage\naction + date + streak]
    J --> K[Append to ecoHistory\nmax 30 entries]
    K --> L{New personal best?}
    L -->|Yes| M[Save longestStreak]
    L -->|No| O
    M --> O[updateStreakDisplay + renderStreakDots\nupdates #streak-display]
    O --> P[syncUp]
    P --> Q{lib.js: isMilestone?\n3 / 7 / 14 / 30}
    Q -->|Yes| R[showShareCard]
    Q -->|No| S([Done])
```

---

## 6. Custom Tasks & Action Counter

```mermaid
flowchart TD
    LOAD([Page load:\nCustomTaskManager.load]) --> MIG{Any legacy\nplain-string entries?}
    MIG -->|Yes| UPG["Upgrade to { task, date }\nwrite back to localStorage"]
    MIG -->|No| RENDER[Render today's tasks]
    UPG --> RENDER

    A([Enter key in\ncustom task input]) --> B{Signed in?}
    B -->|No| N[showNudge]
    B -->|Yes| C[CustomTaskManager.add]
    C --> D["Append { task, date } to\ncustomTasks in localStorage"]
    D --> E[Render in userTaskList]
    E --> F[syncUp]

    G([Add Your Action click\n#counter-controls]) --> H{Signed in?}
    H -->|No| N
    H -->|Yes| I{Eco-action\nlogged today?}
    I -->|No| J[Show pick eco-action first message]
    I -->|Yes| K[Increment actionCount in localStorage]
    K --> L[Update #count display]
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
    B --> F[#proactive-cta visible\nabove category nav]
    B --> P[#streak-preview shown\nstatic 5-of-7 dots + badge\nhides real streak dots]

    G([User clicks action /\ncategory / counter /\ncustom task Enter]) --> H{Signed in?}
    H -->|Yes| I[Normal action proceeds]
    H -->|No| J[showNudge]
    J --> K["Render: 'sign in to save your streak'\nwith anchor link\nrole=status aria-live=polite"]
    K --> L[Show nudge, auto-hide after 4s]
    L --> M{User clicks sign-in link?}
    M -->|Yes| N[Smooth scroll to\nsign-in section]
    M -->|No| O[Nudge fades]
```

---

## 8. Milestone Share Card

```mermaid
flowchart TD
    A([Milestone streak reached]) --> B[showShareCard]
    B --> C[Set streak text\nand milestone message]
    C --> D[Show overlay\nFocus share button]
    D --> E[Add Escape keydown listener]
    D --> T[Add Tab focus trap\nTab cycles forward\nShift+Tab cycles back]

    F([Share button click]) --> G{navigator.share\navailable?}
    G -->|Yes - mobile| H[Web Share API\ntext + URL]
    G -->|No - desktop| I[Copy text + URL\nto clipboard]
    I --> J[Show copied! for 2s\nthen restore share label]

    K([Dismiss button click]) --> L[Hide overlay]
    L --> M[Remove Escape listener\nRemove focus trap]
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
