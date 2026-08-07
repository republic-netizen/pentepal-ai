import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../lib/useTheme';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Signup fields
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPw, setLoginPw] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/chat');
    });
  }, [router]);

  function switchMode(next) {
    setMode(next);
    setError('');
    setNotice('');
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    const username = signupUsername.trim();

    if (!username || !signupEmail.trim()) {
      setError('Please fill in every field.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setError('Username can only contain letters, numbers, dots, and underscores.');
      return;
    }
    if (signupPw.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (signupPw !== confirmPw) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPw,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        username,
        email: signupEmail.trim(),
      });
      if (profileError) {
        setLoading(false);
        // Most likely cause: the username is already taken (unique index).
        if (profileError.code === '23505') {
          setError('That username is already taken. Try another one.');
        } else {
          setError('Could not finish creating your account. Please try again.');
        }
        return;
      }
    }

    setLoading(false);

    if (data.session) {
      // Email confirmation is off — user is signed in immediately.
      router.replace('/chat');
    } else {
      // Email confirmation is on — Supabase sent a confirmation link.
      setNotice('Account created! Check your email to confirm your account, then log in.');
      switchMode('login');
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    const username = loginUsername.trim();
    if (!username || !loginPw) {
      setError('Enter your username and password.');
      return;
    }

    setLoading(true);

    // Students log in with a username, but Supabase auth works by email —
    // so first look up the email that belongs to this username.
    const { data: email, error: lookupError } = await supabase.rpc('get_email_for_username', {
      p_username: username,
    });

    if (lookupError || !email) {
      setLoading(false);
      setError("That username and password don't match any account yet.");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: loginPw,
    });
    setLoading(false);

    if (loginError) {
      setError("That username and password don't match any account yet.");
      return;
    }
    router.replace('/chat');
  }

  return (
    <div className="page">
      <div className="card">
        <div className="banner">
          <div className="banner-toggle">
            <ThemeToggle theme={theme} onToggle={toggleTheme} variant="light" />
          </div>
          <div className="crest">
            <img src="/logo.jpg" alt="Pentecost Preparatory School crest" />
          </div>
          <h1 className="font-display">PentePal</h1>
          <p>Pentecost Preparatory School</p>
          <svg className="steps" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 12 L0 9 L40 9 L40 6 L80 6 L80 3 L400 3" fill="none" stroke="#4E93C4" strokeWidth="1.5" opacity="0.6" />
          </svg>
        </div>

        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => switchMode('login')}>
            Log in
          </button>
          <button type="button" className={mode === 'signup' ? 'tab active' : 'tab'} onClick={() => switchMode('signup')}>
            Sign up
          </button>
        </div>

        {notice && <div className="notice">{notice}</div>}
        {error && <div className="error-banner">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="panel">
            <div className="field">
              <label htmlFor="loginUsername">Username</label>
              <input
                id="loginUsername"
                type="text"
                autoComplete="username"
                placeholder="e.g. jane_mensah"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="loginPw">Password</label>
              <input
                id="loginPw"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
            <div className="form-note">
              New to PentePal?{' '}
              <button type="button" onClick={() => switchMode('signup')}>
                Create an account
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="panel">
            <div className="field">
              <label htmlFor="signupUsername">Username</label>
              <input
                id="signupUsername"
                type="text"
                autoComplete="username"
                placeholder="e.g. jane_mensah"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="signupEmail">Email</label>
              <input
                id="signupEmail"
                type="email"
                autoComplete="email"
                placeholder="e.g. jane.mensah@pentecostprep.edu.gh"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="signupPw">Password</label>
              <input
                id="signupPw"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={signupPw}
                onChange={(e) => setSignupPw(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPw">Confirm password</label>
              <input
                id="confirmPw"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            <div className="form-note">
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')}>
                Log in
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          background:
            repeating-linear-gradient(135deg, rgba(28, 111, 165, 0.035) 0px, rgba(28, 111, 165, 0.035) 2px, transparent 2px, transparent 40px),
            var(--foam);
        }
        .card {
          width: 100%;
          max-width: 400px;
          background: var(--white);
          border-radius: 20px;
          box-shadow: 0 12px 40px rgba(8, 22, 51, 0.12);
          overflow: hidden;
        }
        .banner {
          background: linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 65%, var(--sea) 130%);
          color: var(--white);
          padding: 26px 24px 20px;
          text-align: center;
          position: relative;
        }
        .banner-toggle {
          position: absolute;
          top: 14px;
          right: 14px;
        }
        .crest {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--white);
          padding: 4px;
          margin: 0 auto 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
        .crest img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 50%;
        }
        .banner h1 {
          font-weight: 600;
          font-size: 22px;
          margin: 0;
        }
        .banner p {
          margin: 4px 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.3px;
          color: #9fbbda;
          font-weight: 600;
        }
        .steps {
          height: 12px;
          width: 100%;
          display: block;
          margin-top: 16px;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--line);
        }
        :global(.tab) {
          flex: 1;
          padding: 14px 0;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          color: var(--mist);
          background: none;
          border: none;
          cursor: pointer;
          position: relative;
        }
        :global(.tab.active) {
          color: var(--navy);
        }
        :global(.tab.active::after) {
          content: '';
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: -1px;
          height: 2.5px;
          background: var(--sea);
          border-radius: 2px 2px 0 0;
        }
        :global(.panel) {
          padding: 24px;
        }
        :global(.field) {
          margin-bottom: 16px;
        }
        :global(.field label) {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--navy);
          margin-bottom: 6px;
        }
        :global(.field input) {
          width: 100%;
          padding: 11px 13px;
          border-radius: 10px;
          border: 1.5px solid var(--line);
          font-family: inherit;
          font-size: 14px;
          color: var(--ink);
          background: var(--foam);
        }
        :global(.field input:focus) {
          outline: none;
          border-color: var(--sea);
          background: var(--white);
        }
        :global(.submit-btn) {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: none;
          background: var(--navy);
          color: var(--white);
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 6px;
        }
        :global(.submit-btn:hover) {
          background: var(--sea);
        }
        :global(.submit-btn:disabled) {
          background: var(--mist);
          cursor: not-allowed;
        }
        :global(.form-note) {
          text-align: center;
          font-size: 12.5px;
          color: var(--mist);
          margin-top: 16px;
        }
        :global(.form-note button) {
          background: none;
          border: none;
          color: var(--sea);
          font-weight: 700;
          cursor: pointer;
          font-size: 12.5px;
          padding: 0;
        }
        .notice {
          margin: 20px 24px 0;
          background: var(--foam);
          border: 1.5px solid var(--sea-light);
          color: var(--navy);
          font-size: 12.5px;
          padding: 10px 12px;
          border-radius: 10px;
        }
        .error-banner {
          margin: 20px 24px 0;
          background: var(--error-bg);
          border: 1.5px solid #efc3c3;
          color: var(--error);
          font-size: 12.5px;
          padding: 10px 12px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
