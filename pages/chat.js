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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
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
    <div className="app">
      <header>
        <div className="header-row">
          <div className="crest">
            <img src="/logo.jpg" alt="Pentecost Preparatory School crest" />
          </div>
          <div className="brand-text">
            <h1 className="font-display">PentePal</h1>
            <p>Your study companion</p>
          </div>
          <button className="logout-btn" onClick={handleLogout} aria-label="Log out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="school-name">Pentecost Preparatory School</div>
        <svg className="steps" viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 14 L0 10 L40 10 L40 7 L80 7 L80 4 L400 4" fill="none" stroke="#4E93C4" strokeWidth="1.5" opacity="0.55" />
        </svg>
      </header>

      <div className="subject-rail">
        {SUBJECTS.map((s) => (
          <button key={s.label} className="chip" onClick={() => setInput(s.prompt)}>
            {s.label}
          </button>
        ))}
      </div>

      <div id="chat" ref={chatRef}>
        {loadingHistory ? (
          <div className="empty-state">
            <p>Loading your conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="mark font-display">Ask away.</div>
            <p>
              Pick a subject above or type your question below.
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

      <style jsx>{`
        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          max-width: 760px;
          margin: 0 auto;
          background: var(--white);
          box-shadow: 0 0 40px rgba(8, 22, 51, 0.08);
          overflow: hidden;
        }
        header {
          background: linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 65%, var(--sea) 130%);
          color: var(--white);
          padding: 18px 20px 22px;
          flex-shrink: 0;
        }
        .header-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .crest {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: var(--white);
          padding: 4px;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
        .crest img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 50%;
        }
        .brand-text {
          flex: 1;
        }
        .brand-text h1 {
          font-weight: 600;
          font-size: 22px;
          line-height: 1.1;
          margin: 0;
        }
        .brand-text p {
          margin: 3px 0 0;
          font-size: 12.5px;
          color: #c7d9ee;
          font-weight: 500;
        }
        .logout-btn {
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: var(--white);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .logout-btn:hover {
          background: rgba(255, 255, 255, 0.22);
        }
        .school-name {
          margin: 12px 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          color: #9fbbda;
          font-weight: 600;
        }
        .steps {
          height: 14px;
          width: 100%;
          display: block;
          margin-top: 16px;
        }
        .subject-rail {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          overflow-x: auto;
          background: var(--foam);
          border-bottom: 1px solid var(--line);
          flex-shrink: 0;
        }
        :global(.chip) {
          flex-shrink: 0;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1.5px solid var(--sea-light);
          background: var(--white);
          color: var(--navy);
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        :global(.chip:hover) {
          background: var(--sea);
          color: var(--white);
        }
        #chat {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 12px;
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
          max-width: 82%;
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
          padding: 12px 14px;
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
        @media (max-width: 480px) {
          .app {
            max-width: 100%;
          }
          .brand-text h1 {
            font-size: 19px;
          }
        }
      `}</style>
    </div>
  );
}
