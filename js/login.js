import { supabase } from './supabaseClient.js';
import { initThemeToggle } from './theme.js';

initThemeToggle(document.getElementById('themeToggle'));

const yearEl = document.getElementById('yearNow');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// If already logged in, skip straight to chat.
supabase.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = 'chat.html';
});

const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginPanel = document.getElementById('loginPanel');
const signupPanel = document.getElementById('signupPanel');
const notice = document.getElementById('notice');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

function showTab(which) {
  const isLogin = which === 'login';
  tabLogin.classList.toggle('active', isLogin);
  tabSignup.classList.toggle('active', !isLogin);
  loginPanel.classList.toggle('hidden', !isLogin);
  signupPanel.classList.toggle('hidden', isLogin);
  hide(loginError);
  hide(signupError);
}

function show(el, message) {
  el.textContent = message;
  el.classList.add('show');
}
function hide(el) {
  el.classList.remove('show');
  el.textContent = '';
}

tabLogin.addEventListener('click', () => showTab('login'));
tabSignup.addEventListener('click', () => showTab('signup'));
document.getElementById('goSignup').addEventListener('click', () => showTab('signup'));
document.getElementById('goLogin').addEventListener('click', () => showTab('login'));

// ---------- Show/hide password ----------
document.querySelectorAll('.pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.classList.toggle('showing', !showing);
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
});

// ---------- Sign up ----------
document.getElementById('signupPanel').addEventListener('submit', async (e) => {
  e.preventDefault();
  hide(signupError);
  hide(notice);

  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pw = document.getElementById('signupPw').value;
  const confirmPw = document.getElementById('confirmPw').value;
  const signupBtn = document.getElementById('signupBtn');

  if (!username || !email) {
    show(signupError, 'Please fill in every field.');
    return;
  }
  if (username.length < 3) {
    show(signupError, 'Username must be at least 3 characters.');
    return;
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    show(signupError, 'Username can only contain letters, numbers, dots, and underscores.');
    return;
  }
  if (pw.length < 6) {
    show(signupError, 'Password must be at least 6 characters.');
    return;
  }
  if (pw !== confirmPw) {
    show(signupError, "Passwords don't match.");
    return;
  }

  signupBtn.disabled = true;
  signupBtn.textContent = 'Creating account...';

  const { data, error: signUpError } = await supabase.auth.signUp({ email, password: pw });

  if (signUpError) {
    signupBtn.disabled = false;
    signupBtn.textContent = 'Create account';
    show(signupError, signUpError.message);
    return;
  }

  const userId = data.user?.id;
  if (userId) {
    const { error: profileError } = await supabase.from('profiles').insert({ id: userId, username, email });
    if (profileError) {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Create account';
      if (profileError.code === '23505') {
        show(signupError, 'That username is already taken. Try another one.');
      } else {
        show(signupError, 'Could not finish creating your account. Please try again.');
      }
      return;
    }
  }

  signupBtn.disabled = false;
  signupBtn.textContent = 'Create account';

  if (data.session) {
    window.location.href = 'chat.html';
  } else {
    show(notice, 'Account created! Check your email to confirm your account, then log in.');
    showTab('login');
  }
});

// ---------- Log in ----------
document.getElementById('loginPanel').addEventListener('submit', async (e) => {
  e.preventDefault();
  hide(loginError);
  hide(notice);

  const username = document.getElementById('loginUsername').value.trim();
  const pw = document.getElementById('loginPw').value;
  const loginBtn = document.getElementById('loginBtn');

  if (!username || !pw) {
    show(loginError, 'Enter your username and password.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  // Students log in with a username, but Supabase auth works by email —
  // so first look up the email that belongs to this username.
  const { data: email, error: lookupError } = await supabase.rpc('get_email_for_username', {
    p_username: username,
  });

  if (lookupError || !email) {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log in';
    show(loginError, "That username and password don't match any account yet.");
    return;
  }

  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password: pw });

  loginBtn.disabled = false;
  loginBtn.textContent = 'Log in';

  if (loginErr) {
    show(loginError, "That username and password don't match any account yet.");
    return;
  }

  window.location.href = 'chat.html';
});
