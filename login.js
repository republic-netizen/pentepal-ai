import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const CLASS_OPTIONS = [
  'Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
  'JHS 1', 'JHS 2', 'JHS 3',
];

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
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

    if (!fullName.trim() || !className || !studentId.trim() || !signupEmail.trim()) {
      setError('Please fill in every field.');
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
        full_name: fullName.trim(),
        class_name: className,
        student_id: studentId.trim(),
        email: signupEmail.trim(),
      });
      if (profileError) {
        console.error('Profile insert failed:', profileError);
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

    if (!loginEmail.trim() || !loginPw) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPw,
    });
    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }
    router.replace('/chat');
  }

  return (
    <div className="page">
      <div className="card">
        <div className="banner">
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
              <label htmlFor="loginEmail">School email</label>
              <input
                id="loginEmail"
                type="email"
                autoComplete="username"
                placeholder="e.g. jane.mensah@pentecostprep.edu.gh"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
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
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="e.g. Jane Mensah"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="row-2">
              <div className="field">
                <label htmlFor="classLevel">Class</label>
                <select id="classLevel" value={className} onChange={(e) => setClassName(e.target.value)}>
                  <option value="">Select</option>
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="studentId">Student ID</label>
                <input
                  id="studentId"
                  type="text"
                  placeholder="e.g. PPS-0231"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="signupEmail">School email</label>
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
        :global(.field input),
        :global(.field select) {
          width: 100%;
          padding: 11px 13px;
          border-radius: 10px;
          border: 1.5px solid var(--line);
          font-family: inherit;
          font-size: 14px;
          color: var(--ink);
          background: var(--foam);
        }
        :global(.field input:focus),
        :global(.field select:focus) {
          outline: none;
          border-color: var(--sea);
          background: var(--white);
        }
        :global(.row-2) {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
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
