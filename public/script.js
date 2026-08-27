let currentBusiness = null;
let typingCounter = 0;

const loginScreen    = document.getElementById('login-screen');
const chatScreen     = document.getElementById('chat-screen');
const businessSelect = document.getElementById('business-select');
const startBtn       = document.getElementById('start-btn');
const signoutBtn     = document.getElementById('signout-btn');
const businessBadge  = document.getElementById('business-badge');
const messagesArea   = document.getElementById('messages');
const messageInput   = document.getElementById('message-input');
const sendBtn        = document.getElementById('send-btn');
const suggestionsEl  = document.getElementById('suggestions');

async function loadBusinesses() {
  try {
    const res = await fetch('/api/businesses');
    const names = await res.json();
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      businessSelect.appendChild(opt);
    });
  } catch {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Error loading businesses — is the server running?';
    opt.disabled = true;
    businessSelect.appendChild(opt);
  }
}

businessSelect.addEventListener('change', () => {
  startBtn.disabled = !businessSelect.value;
});

startBtn.addEventListener('click', () => {
  currentBusiness = businessSelect.value;
  if (!currentBusiness) return;

  loginScreen.classList.remove('active');
  chatScreen.classList.add('active');
  businessBadge.textContent = currentBusiness;

  addBotMessage(
    `Hi! I'm the FieldFlow support bot. I can help you get set up, answer how-to questions, or look up info about your **${currentBusiness}** account.\n\nWhat can I help you with today?`,
    ['How do I schedule a job?', 'What plan am I on?', 'Show my recent jobs', 'How do I add a client?']
  );

  messageInput.focus();
});

signoutBtn.addEventListener('click', () => {
  currentBusiness = null;
  messagesArea.innerHTML = '';
  suggestionsEl.innerHTML = '';
  businessSelect.value = '';
  startBtn.disabled = true;
  chatScreen.classList.remove('active');
  loginScreen.classList.add('active');
});

async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  addUserMessage(trimmed);
  messageInput.value = '';
  suggestionsEl.innerHTML = '';

  const typingId = addTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, businessName: currentBusiness })
    });
    const data = await res.json();
    removeTyping(typingId);
    addBotMessage(data.text, data.suggestions || []);
  } catch {
    removeTyping(typingId);
    addBotMessage("Sorry, I'm having trouble connecting right now. Please try again in a moment.", []);
  }
}

sendBtn.addEventListener('click', () => sendMessage(messageInput.value));

messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(messageInput.value);
  }
});

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function addUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'message user';
  el.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
  messagesArea.appendChild(el);
  scrollBottom();
}

function addBotMessage(text, suggestions = []) {
  const el = document.createElement('div');
  el.className = 'message bot';
  el.innerHTML = `
    <div class="message-avatar">FF</div>
    <div class="message-bubble">${renderMarkdown(text)}</div>
  `;
  messagesArea.appendChild(el);

  suggestionsEl.innerHTML = '';
  suggestions.forEach(s => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = s;
    chip.addEventListener('click', () => sendMessage(s));
    suggestionsEl.appendChild(chip);
  });

  scrollBottom();
}

function addTyping() {
  const id = ++typingCounter;
  const el = document.createElement('div');
  el.className = 'message bot';
  el.id = `typing-${id}`;
  el.innerHTML = `
    <div class="message-avatar">FF</div>
    <div class="message-bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  messagesArea.appendChild(el);
  scrollBottom();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(`typing-${id}`);
  if (el) el.remove();
}

function scrollBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

loadBusinesses();
