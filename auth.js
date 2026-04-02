function setupAuth() {
  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const signInBtn = document.getElementById('sign-in-btn');
  const signedInInfo = document.getElementById('signed-in-info');
  const userEmailEl = document.getElementById('user-email');
  const signOutBtn = document.getElementById('sign-out-btn');
  const authMessage = document.getElementById('auth-message');

  if (!form) {
    return;
  }

  function showSignedIn(email) {
    form.hidden = true;
    signedInInfo.hidden = false;
    userEmailEl.textContent = email;
    authMessage.textContent = '';
  }

  function showSignedOut() {
    form.hidden = false;
    signedInInfo.hidden = true;
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

    const { error } = await db.auth.signInWithOtp({ email });

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
    await db.auth.signOut();
  });
}

window.setupAuth = setupAuth;
