import { supabase } from './supabaseClient.js';
import { initThemeToggle } from './theme.js';

initThemeToggle(document.getElementById('themeToggle'));

const yearEl = document.getElementById('yearNow');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const chatEl = document.getElementById('chat');
const composer = document.getElementById('composer');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const sidebar = document.getElementById('sidebar');
const scrim = document.getElementById('scrim');
const menuBtn = document.getElementById('menuBtn');
const usernameLabel = document.getElementById('usernameLabel');
const avatarInitial = document.getElementById('avatarInitial');
const conversationNav = document.getElementById('conversationNav');
const newChatBtn = document.getElementById('newChatBtn');

let session = null;
let conversations = []; // { id, title, created_at }
let currentConversationId = null;
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .single();

  if (profile?.username) {
    usernameLabel.textContent = profile.username;
    avatarInitial.textContent = profile.username.charAt(0).toUpperCase();
  }

  await loadConversations();

  if (conversations.length > 0) {
    await openConversation(conversations[0].id);
  } else {
    await startNewConversation();
  }
}

// ---------- Conversations ----------
async function loadConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (!error && data) conversations = data;
  renderConversationList();
}

function renderConversationList() {
  conversationNav.innerHTML = '';

  if (conversations.length === 0) {
    const div = document.createElement('div');
    div.className = 'conversation-empty';
    div.textContent = 'No chats yet — start one below.';
    conversationNav.appendChild(div);
    return;
  }

  const groups = groupConversationsByDate(conversations);

  groups.forEach((group) => {
    if (group.items.length === 0) return;

    const label = document.createElement('div');
    label.className = 'conversation-group-label';
    label.textContent = group.label;
    conversationNav.appendChild(label);

    group.items.forEach((c) => {
      const btn = document.createElement('button');
      btn.className = 'conversation-item' + (c.id === currentConversationId ? ' active' : '');
      btn.textContent = c.title || 'New chat';
      btn.addEventListener('click', () => {
        openConversation(c.id);
        closeSidebar();
      });
      conversationNav.appendChild(btn);
    });
  });
}

function groupConversationsByDate(list) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const buckets = {
    today: { label: 'Today', items: [] },
    yesterday: { label: 'Yesterday', items: [] },
    week: { label: 'Previous 7 days', items: [] },
    older: { label: 'Older', items: [] },
  };

  list.forEach((c) => {
    const created = new Date(c.created_at);
    if (created >= startOfToday) buckets.today.items.push(c);
    else if (created >= startOfYesterday) buckets.yesterday.items.push(c);
    else if (created >= startOfWeek) buckets.week.items.push(c);
    else buckets.older.items.push(c);
  });

  return [buckets.today, buckets.yesterday, buckets.week, buckets.older];
}

async function startNewConversation() {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: session.user.id, title: 'New chat' })
    .select('id, title, created_at')
    .single();

  if (error || !data) {
    console.error('Could not start a new chat:', error);
    return;
  }

  conversations.unshift(data);
  currentConversationId = data.id;
  messages = [];
  renderConversationList();
  renderMessages();
  promptInput.focus();
}

async function openConversation(id) {
  currentConversationId = id;
  renderConversationList();

  chatEl.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  const { data, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  messages = !error && data ? data.map((m) => ({ role: m.role, content: m.content })) : [];
  renderMessages();
}

newChatBtn.addEventListener('click', () => {
  startNewConversation();
  closeSidebar();
});

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

// ---------- Rendering messages ----------
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
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: currentConversationId, user_id: session.user.id, role, content });
  if (error) console.error('Failed to save message:', error);
}

async function maybeRenameConversation(firstQuestion) {
  const isFirstMessage = messages.length === 1; // just pushed the user's first message
  if (!isFirstMessage) return;

  const title = firstQuestion.length > 42 ? firstQuestion.slice(0, 42).trim() + '…' : firstQuestion;

  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', currentConversationId);

  if (!error) {
    const convo = conversations.find((c) => c.id === currentConversationId);
    if (convo) convo.title = title;
    renderConversationList();
  }
}

async function sendMessage(question) {
  const trimmed = question.trim();
  if (!trimmed || sending || !currentConversationId) return;

  messages.push({ role: 'user', content: trimmed });
  renderMessages();
  promptInput.value = '';
  autoGrow();
  sending = true;
  sendBtn.disabled = true;
  saveMessage('user', trimmed);
  maybeRenameConversation(trimmed);
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
