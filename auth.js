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

  function showSignedIn(email) {
    form.hidden = true;
    signedInInfo.hidden = false;
    mainContent.dataset.authed = 'true';
    setCustomTaskInput(true);
    const nudge = document.getElementById('sign-in-nudge');
    if (nudge) nudge.hidden = true;
    userEmailEl.textContent = email;
    authMessage.textContent = '';
    if (window.sync) window.sync.syncDown();
  }

  function showSignedOut() {
    form.hidden = false;
    signedInInfo.hidden = true;
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
      showSignedIn(session.user.email);
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
      showSignedOut();
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

    const keys = ['ecoAction', 'ecoHistory', 'customTasks', 'longestStreak', 'actionCount', 'countDate'];
    keys.forEach(k => localStorage.removeItem(k));

    await db.auth.signOut();
    showSignedOut();
  });
}

window.setupAuth = setupAuth;
