import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const SUBJECTS = [
  { label: 'Mathematics', prompt: 'Can you help me with a Mathematics problem?' },
  { label: 'English', prompt: 'Can you help explain something in English Language?' },
  { label: 'Science', prompt: 'Can you help me with an Integrated Science question?' },
  { label: 'Social Studies', prompt: 'Can you help me with Social Studies?' },
  { label: 'French', prompt: 'Can you help me with French?' },
  { label: 'ICT', prompt: 'Can you help me with ICT?' },
  { label: 'R.M.E', prompt: 'Can you help me with R.M.E?' },
];

export default function Chat() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setSession(data.session);
      setCheckingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        router.replace('/login');
      } else {
        setSession(newSession);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!session) return;

    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
      if (data?.username) setUsername(data.username);
    }

    async function loadHistory() {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(data.map((m) => ({ role: m.role, content: m.content })));
      }
      setLoadingHistory(false);
    }

    loadProfile();
    loadHistory();
  }, [session]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, sending]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 110) + 'px';
  }

  async function saveMessage(role, content) {
    if (!session) return;
    const { error } = await supabase.from('messages').insert({
      user_id: session.user.id,
      role,
      content,
    });
    if (error) console.error('Failed to save message:', error);
  }

  async function sendMessage(question) {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    setErrorMsg('');
    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setSidebarOpen(false);
    saveMessage('user', trimmed);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      saveMessage('assistant', data.answer);
    } catch (err) {
      console.error('PentePal error:', err);
      setErrorMsg("PentePal couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleSubjectClick(prompt) {
    setInput(prompt);
    setSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (checkingAuth) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mist)' }}>
        Checking your session...
      </div>
    );
  }

  return (
    <div className="shell">
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <aside className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-brand">
          <div className="crest">
            <img src="/logo.jpg" alt="Pentecost Preparatory School crest" />
          </div>
          <div>
            <h1 className="font-display">PentePal</h1>
            <p>Pentecost Prep School</p>
          </div>
        </div>

        <div className="sidebar-section-label">Subjects</div>
        <nav className="subject-nav">
          {SUBJECTS.map((s) => (
            <button key={s.label} className="subject-link" onClick={() => handleSubjectClick(s.prompt)}>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{(username || '?').charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <div className="user-name">{username || 'Student'}</div>
              <div className="user-sub">Signed in</div>
            </div>
          </div>
          <button className="logout-link" onClick={handleLogout}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      <div className="main">
        <header>
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="header-text">
            <h2 className="font-display">Your study companion</h2>
            <p>Ask anything, get a clear answer</p>
          </div>
          <svg className="steps" viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 14 L0 10 L40 10 L40 7 L80 7 L80 4 L400 4" fill="none" stroke="#4E93C4" strokeWidth="1.5" opacity="0.55" />
          </svg>
        </header>

        <div id="chat" ref={chatRef}>
          {loadingHistory ? (
            <div className="empty-state">
              <p>Loading your conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="mark font-display">Ask away.</div>
              <p>
                Pick a subject from the sidebar or type your question below.
                <br />
                I&apos;ll keep every answer short and clear.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'bot'}`}>
                {m.role !== 'user' && <span className="label">PentePal</span>}
                {m.content}
              </div>
            ))
          )}

          {sending && (
            <div className="typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}

          {errorMsg && <div className="msg error">{errorMsg}</div>}
        </div>

        <div className="hint">PentePal gives concise answers — ask a follow-up any time.</div>

        <form id="composer" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Type your question..."
            aria-label="Your question"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" id="sendBtn" aria-label="Send question" disabled={sending || !input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L20 4L13 20L11 13L4 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>

      <style jsx>{`
        .shell {
          height: 100vh;
          display: flex;
          background: var(--white);
        }

        /* ---------- Sidebar ---------- */
        .sidebar {
          width: 250px;
          flex-shrink: 0;
          background: linear-gradient(180deg, var(--navy-deep) 0%, var(--navy) 100%);
          color: var(--white);
          display: flex;
          flex-direction: column;
          padding: 20px 16px;
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 18px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }
        .crest {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--white);
          padding: 3px;
          flex-shrink: 0;
        }
        .crest img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 50%;
        }
        .sidebar-brand h1 {
          font-weight: 600;
          font-size: 16.5px;
          margin: 0;
        }
        .sidebar-brand p {
          margin: 1px 0 0;
          font-size: 10px;
          color: #9fbbda;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .sidebar-section-label {
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #7d9bc2;
          margin-bottom: 8px;
          padding: 0 4px;
        }
        .subject-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          overflow-y: auto;
        }
        :global(.subject-link) {
          text-align: left;
          background: none;
          border: none;
          color: #dce8f6;
          font-size: 13.5px;
          font-weight: 500;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
        }
        :global(.subject-link:hover) {
          background: rgba(255, 255, 255, 0.08);
          color: var(--white);
        }
        .sidebar-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          padding-top: 14px;
          margin-top: 14px;
        }
        .user-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--sea);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
        }
        .user-sub {
          font-size: 10.5px;
          color: #9fbbda;
        }
        :global(.logout-link) {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: #dce8f6;
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
        }
        :global(.logout-link:hover) {
          background: rgba(255, 255, 255, 0.15);
        }

        .scrim {
          display: none;
        }

        /* ---------- Main panel ---------- */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        header {
          background: var(--white);
          border-bottom: 1px solid var(--line);
          padding: 18px 24px 16px;
          flex-shrink: 0;
          position: relative;
        }
        .header-text h2 {
          font-weight: 600;
          font-size: 19px;
          margin: 0;
          color: var(--navy);
        }
        .header-text p {
          margin: 3px 0 0;
          font-size: 12.5px;
          color: var(--mist);
        }
        .menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--navy);
          cursor: pointer;
          margin-bottom: 8px;
        }
        .steps {
          height: 10px;
          width: 100%;
          display: block;
          margin-top: 14px;
        }
        #chat {
          flex: 1;
          overflow-y: auto;
          padding: 24px 24px 12px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: repeating-linear-gradient(135deg, rgba(28, 111, 165, 0.03) 0px, rgba(28, 111, 165, 0.03) 2px, transparent 2px, transparent 40px);
        }
        .empty-state {
          margin: auto 0;
          text-align: center;
          padding: 20px 10px;
          color: var(--mist);
        }
        .empty-state .mark {
          font-size: 19px;
          color: var(--navy);
          font-weight: 600;
          margin-bottom: 6px;
        }
        .empty-state p {
          font-size: 13.5px;
          margin: 4px 0 0;
          line-height: 1.5;
        }
        :global(.msg) {
          max-width: 70%;
          padding: 11px 14px;
          border-radius: 16px;
          font-size: 14.5px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        :global(.msg.user) {
          align-self: flex-end;
          background: var(--navy);
          color: var(--white);
          border-bottom-right-radius: 4px;
        }
        :global(.msg.bot) {
          align-self: flex-start;
          background: var(--white);
          color: var(--ink);
          border: 1.5px solid var(--line);
          border-bottom-left-radius: 4px;
        }
        :global(.msg .label) {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.6px;
          color: var(--sea);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        :global(.msg.error) {
          align-self: flex-start;
          background: var(--error-bg);
          color: var(--error);
          border: 1.5px solid #efc3c3;
          border-bottom-left-radius: 4px;
        }
        .typing {
          align-self: flex-start;
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          background: var(--white);
          border: 1.5px solid var(--line);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
        }
        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--sea-light);
          animation: bounce 1.2s infinite ease-in-out;
        }
        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }
        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }
        @keyframes bounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
        .hint {
          text-align: center;
          font-size: 10.5px;
          color: var(--mist);
          padding: 0 0 10px;
          flex-shrink: 0;
        }
        #composer {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 12px 20px 18px;
          border-top: 1px solid var(--line);
          background: var(--white);
          flex-shrink: 0;
        }
        #composer textarea {
          flex: 1;
          resize: none;
          max-height: 110px;
          padding: 11px 14px;
          border-radius: 14px;
          border: 1.5px solid var(--line);
          font-family: inherit;
          font-size: 14.5px;
          line-height: 1.4;
          color: var(--ink);
          background: var(--foam);
        }
        #composer textarea:focus {
          outline: none;
          border-color: var(--sea);
          background: var(--white);
        }
        #sendBtn {
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: none;
          background: var(--navy);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        #sendBtn:hover {
          background: var(--sea);
        }
        #sendBtn:disabled {
          background: var(--mist);
          cursor: not-allowed;
        }

        @media (max-width: 820px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 30;
            transform: translateX(-100%);
            transition: transform 0.2s ease;
            box-shadow: 8px 0 24px rgba(8, 22, 51, 0.2);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .scrim {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(8, 22, 51, 0.4);
            z-index: 20;
          }
          .menu-btn {
            display: inline-flex;
          }
        }
      `}</style>
    </div>
  );
}
