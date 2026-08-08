import { supabase } from './supabaseClient.js';
import { initThemeToggle } from './theme.js';

initThemeToggle(document.getElementById('themeToggle'));

const chatEl = document.getElementById('chat');
const emptyState = document.getElementById('emptyState');
const composer = document.getElementById('composer');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const sidebar = document.getElementById('sidebar');
const scrim = document.getElementById('scrim');
const menuBtn = document.getElementById('menuBtn');
const usernameLabel = document.getElementById('usernameLabel');
const avatarInitial = document.getElementById('avatarInitial');

let session = null;
let messages = []; // { role, content }
let sending = false;

// ---------- Auth check ----------
const { data: sessionData } = await supabase.auth.getSession();
if (!sessionData.session) {
  window.location.href = 'login.html';
} else {
  session = sessionData.session;
  init();
}

supabase.auth.onAuthStateChange((_event, newSession) => {
  if (!newSession) window.location.href = 'login.html';
});

async function init() {
  // Load profile (for the username shown in the sidebar)
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .single();

  if (profile?.username) {
    usernameLabel.textContent = profile.username;
    avatarInitial.textContent = profile.username.charAt(0).toUpperCase();
  }

  // Load message history
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(100);

  if (!error && data) {
    messages = data.map((m) => ({ role: m.role, content: m.content }));
  }
  renderMessages();
}

// ---------- Sidebar (mobile) ----------
menuBtn.addEventListener('click', () => {
  sidebar.classList.add('open');
  scrim.classList.add('show');
});
scrim.addEventListener('click', closeSidebar);
function closeSidebar() {
  sidebar.classList.remove('open');
  scrim.classList.remove('show');
}

document.getElementById('subjectNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.subject-link');
  if (!btn) return;
  promptInput.value = btn.dataset.prompt;
  autoGrow();
  closeSidebar();
  promptInput.focus();
});

// ---------- Rendering ----------
function renderMessages() {
  chatEl.innerHTML = '';

  if (messages.length === 0) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `<div class="mark font-display">Ask away.</div>
      <p>Pick a subject from the sidebar or type your question below.<br>I'll keep every answer short and clear.</p>`;
    chatEl.appendChild(div);
    return;
  }

  messages.forEach((m) => {
    const div = document.createElement('div');
    div.className = 'msg ' + (m.role === 'user' ? 'user' : 'bot');
    if (m.role !== 'user') {
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = 'PentePal';
      div.appendChild(label);
    }
    div.appendChild(document.createTextNode(m.content));
    chatEl.appendChild(div);
  });

  scrollToBottom();
}

function scrollToBottom() {
  chatEl.scrollTop = chatEl.scrollHeight;
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'typing';
  el.id = 'typingIndicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  chatEl.appendChild(el);
  scrollToBottom();
}
function hideTyping() {
  document.getElementById('typingIndicator')?.remove();
}
function showError(text) {
  const div = document.createElement('div');
  div.className = 'msg error';
  div.textContent = text;
  chatEl.appendChild(div);
  scrollToBottom();
}

// ---------- Sending messages ----------
async function saveMessage(role, content) {
  const { error } = await supabase.from('messages').insert({ user_id: session.user.id, role, content });
  if (error) console.error('Failed to save message:', error);
}

async function sendMessage(question) {
  const trimmed = question.trim();
  if (!trimmed || sending) return;

  messages.push({ role: 'user', content: trimmed });
  renderMessages();
  promptInput.value = '';
  autoGrow();
  sending = true;
  sendBtn.disabled = true;
  saveMessage('user', trimmed);
  showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();
    hideTyping();

    if (!response.ok) throw new Error(data.error || 'Something went wrong.');

    messages.push({ role: 'assistant', content: data.answer });
    renderMessages();
    saveMessage('assistant', data.answer);
  } catch (err) {
    hideTyping();
    console.error('PentePal error:', err);
    showError("PentePal couldn't reach the server. Please check your connection and try again.");
  } finally {
    sending = false;
    sendBtn.disabled = !promptInput.value.trim();
    promptInput.focus();
  }
}

function autoGrow() {
  promptInput.style.height = 'auto';
  promptInput.style.height = Math.min(promptInput.scrollHeight, 110) + 'px';
}

composer.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(promptInput.value);
});

promptInput.addEventListener('input', () => {
  autoGrow();
  sendBtn.disabled = !promptInput.value.trim();
});

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(promptInput.value);
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
});
