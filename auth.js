// Cross-script dependencies:
//   window.db        — Supabase client, set by supabase-client.js (module)
//   window.sync      — { syncUp, syncDown }, set by sync.js (module)
//   window.resetApp  — clears localStorage and resets UI, set by script.js (defer)
//   window.triggerToast — exposed below so sync.js can show error toasts

function triggerToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = 'auth-toast' + (isError ? ' auth-toast--error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);
  toast.getBoundingClientRect(); // force reflow so transition fires
  toast.classList.add('auth-toast--visible');
  setTimeout(() => {
    toast.classList.remove('auth-toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 2500);
}
window.triggerToast = triggerToast;

function setupAuth() {
  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const signInBtn = document.getElementById('sign-in-btn');
  const signedInInfo = document.getElementById('signed-in-info');
  const userEmailEl = document.getElementById('user-email');
  const signOutBtn = document.getElementById('sign-out-btn');
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  const authMessage = document.getElementById('auth-message');

  const mainContent = document.getElementById('main-content');

  if (!form) {
    return;
  }

  function setCustomTaskInput(enabled) {
    const input = document.getElementById('customTask');
    if (input) input.disabled = !enabled;
  }

  function showSignedIn(email, toast = false) {
    form.hidden = true;
    signedInInfo.hidden = false;
    const intro = document.getElementById('sign-in-intro');
    if (intro) intro.hidden = true;
    mainContent.dataset.authed = 'true';
    setCustomTaskInput(true);
    const nudge = document.getElementById('sign-in-nudge');
    if (nudge) nudge.hidden = true;
    userEmailEl.textContent = email;
    authMessage.textContent = '';
    if (toast) triggerToast("You're signed in. Start your streak!");
    if (window.sync) window.sync.syncDown();
  }

  function showSignedOut() {
    form.hidden = false;
    signedInInfo.hidden = true;
    const intro = document.getElementById('sign-in-intro');
    if (intro) intro.hidden = false;
    mainContent.dataset.authed = 'false';
    setCustomTaskInput(false);
  }

  db.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      showSignedIn(session.user.email);
    } else {
      showSignedOut();
    }
  });

  db.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showSignedIn(session.user.email, _event === 'SIGNED_IN');
    } else {
      showSignedOut();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      return;
    }

    signInBtn.disabled = true;
    signInBtn.textContent = 'sending...';

    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://onesmallhoof.com/' },
    });

    if (error) {
      authMessage.textContent = 'something went wrong. please try again.';
    } else {
      authMessage.textContent = 'check your email for a sign-in link.';
      emailInput.value = '';
    }

    signInBtn.disabled = false;
    signInBtn.textContent = 'sign in';
  });

  signOutBtn.addEventListener('click', async () => {
    signOutBtn.disabled = true;
    const { error } = await db.auth.signOut();
    if (!error) {
      // onAuthStateChange fires during signOut() and calls showSignedOut() automatically.
      // resetApp() is called here (not in showSignedOut) because it should only run
      // on an explicit sign-out action, not on every auth state change.
      if (window.resetApp) window.resetApp();
    }
    signOutBtn.disabled = false;
  });

  deleteAccountBtn.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'This will permanently delete your account and all your data. This cannot be undone. Are you sure?'
    );
    if (!confirmed) return;

    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = 'deleting...';

    const { error } = await db.rpc('delete_user_account');
    if (error) {
      authMessage.textContent = 'something went wrong. please try again.';
      deleteAccountBtn.disabled = false;
      deleteAccountBtn.textContent = 'delete account';
      return;
    }

    if (window.resetApp) window.resetApp();
    await db.auth.signOut();
    showSignedOut();
  });
}

window.setupAuth = setupAuth;
