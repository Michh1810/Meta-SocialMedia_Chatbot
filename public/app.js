/* ==========================================
   AI Auto-Reply Tool — Frontend App
   ========================================== */

(function () {
  'use strict';

  // ==========================================
  // State
  // ==========================================
  let currentPage = 'dashboard';
  let settings = {};

  // ==========================================
  // DOM Elements
  // ==========================================
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  const globalAutoReply = document.getElementById('global-auto-reply');

  // ==========================================
  // Navigation
  // ==========================================
  const pageTitles = {
    dashboard: { title: 'Dashboard', subtitle: 'Tổng quan hoạt động auto-reply' },
    messages: { title: 'Tin nhắn', subtitle: 'Xem tất cả tin nhắn đã nhận và phản hồi' },
    conversations: { title: 'Hội thoại', subtitle: 'Quản lý các cuộc hội thoại' },
    test: { title: 'Test AI', subtitle: 'Kiểm tra phản hồi AI trước khi triển khai' },
    settings: { title: 'Cài đặt', subtitle: 'Cấu hình API keys và tùy chỉnh AI' }
  };

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });

  function navigateTo(page) {
    currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // Update header
    const info = pageTitles[page];
    pageTitle.textContent = info.title;
    pageSubtitle.textContent = info.subtitle;

    // Load data for the page
    loadPageData(page);

    // Close sidebar on mobile
    sidebar.classList.remove('open');
  }

  // Mobile sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // ==========================================
  // API Helpers
  // ==========================================
  async function api(endpoint, options = {}) {
    try {
      const res = await fetch(`/api${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      return await res.json();
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      return null;
    }
  }

  // ==========================================
  // Load Page Data
  // ==========================================
  function loadPageData(page) {
    switch (page) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'messages':
        loadMessages();
        break;
      case 'conversations':
        loadConversations();
        break;
      case 'settings':
        loadSettings();
        break;
    }
  }

  // ==========================================
  // Dashboard
  // ==========================================
  async function loadDashboard() {
    const stats = await api('/stats');
    if (!stats) return;

    animateNumber('stat-total-messages', stats.totalMessages || 0);
    animateNumber('stat-today-messages', stats.todayMessages || 0);
    animateNumber('stat-total-conversations', stats.totalConversations || 0);

    const autoReplyOn = settings.auto_reply_enabled !== 'false';
    document.getElementById('stat-ai-status').textContent = autoReplyOn ? 'ON' : 'OFF';
    document.getElementById('stat-ai-status').style.background = autoReplyOn
      ? 'linear-gradient(135deg, #10b981, #06b6d4)'
      : 'linear-gradient(135deg, #ef4444, #f97316)';
    document.getElementById('stat-ai-status').style.webkitBackgroundClip = 'text';
    document.getElementById('stat-ai-status').style.webkitTextFillColor = 'transparent';

    // Platform counts
    const ps = stats.platformStats || {};
    document.getElementById('platform-messenger-count').textContent = ps.messenger || 0;
    document.getElementById('platform-instagram-count').textContent = ps.instagram || 0;
    document.getElementById('platform-tiktok-count').textContent = ps.tiktok || 0;

    // Recent messages
    const messages = await api('/messages?limit=10');
    renderRecentMessages(messages || []);
  }

  function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    const start = parseInt(el.textContent) || 0;
    const diff = target - start;
    if (diff === 0) { el.textContent = target; return; }

    const duration = 500;
    const startTime = Date.now();

    function step() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = Math.round(start + diff * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderRecentMessages(messages) {
    const tbody = document.getElementById('recent-messages-body');
    if (!messages.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Chưa có tin nhắn nào. Hãy kết nối fanpage để bắt đầu!</td></tr>';
      return;
    }

    tbody.innerHTML = messages.filter(m => m.direction === 'incoming').slice(0, 10).map(m => `
      <tr>
        <td><span class="platform-badge ${m.platform}">${platformEmoji(m.platform)} ${m.platform}</span></td>
        <td>${escapeHtml(m.sender_name || m.sender_id)}</td>
        <td title="${escapeHtml(m.message_text)}">${escapeHtml(truncate(m.message_text, 50))}</td>
        <td title="${escapeHtml(m.reply_text || '')}">${escapeHtml(truncate(m.reply_text || '—', 50))}</td>
        <td>${formatTime(m.timestamp)}</td>
      </tr>
    `).join('');
  }

  // ==========================================
  // Messages Page
  // ==========================================
  async function loadMessages() {
    const messages = await api('/messages?limit=100');
    const tbody = document.getElementById('all-messages-body');

    if (!messages || !messages.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Chưa có tin nhắn</td></tr>';
      return;
    }

    tbody.innerHTML = messages.map(m => `
      <tr>
        <td><span class="platform-badge ${m.platform}">${platformEmoji(m.platform)} ${m.platform}</span></td>
        <td><span class="direction-badge ${m.direction}">${m.direction === 'incoming' ? '📥 Nhận' : '📤 Gửi'}</span></td>
        <td>${escapeHtml(m.sender_name || m.sender_id)}</td>
        <td title="${escapeHtml(m.message_text)}">${escapeHtml(truncate(m.message_text, 40))}</td>
        <td title="${escapeHtml(m.reply_text || '')}">${escapeHtml(truncate(m.reply_text || '—', 40))}</td>
        <td>${formatTime(m.timestamp)}</td>
      </tr>
    `).join('');
  }

  document.getElementById('refresh-messages').addEventListener('click', loadMessages);

  // ==========================================
  // Conversations Page
  // ==========================================
  async function loadConversations() {
    const conversations = await api('/conversations?limit=50');
    const list = document.getElementById('conversations-list');

    if (!conversations || !conversations.length) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><p>Chưa có hội thoại nào</p></div>';
      return;
    }

    list.innerHTML = conversations.map(c => `
      <div class="conversation-item" data-id="${escapeHtml(c.id)}">
        <div class="conversation-header">
          <span class="conversation-name">${escapeHtml(c.sender_name || c.sender_id)}</span>
          <span class="conversation-time">${formatTime(c.updated_at)}</span>
        </div>
        <div class="conversation-preview">${escapeHtml(truncate(c.last_message || '', 80))}</div>
        <div class="conversation-meta">
          <span class="platform-badge ${c.platform}">${platformEmoji(c.platform)} ${c.platform}</span>
          <span style="font-size:11px;color:var(--text-muted)">${c.message_count} tin nhắn</span>
        </div>
      </div>
    `).join('');
  }

  // ==========================================
  // Test AI
  // ==========================================
  const testSendBtn = document.getElementById('test-send');
  const chatSendBtn = document.getElementById('chat-send');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');

  testSendBtn.addEventListener('click', async () => {
    const message = document.getElementById('test-message').value.trim();
    const platform = document.getElementById('test-platform').value;

    if (!message) return showToast('Vui lòng nhập tin nhắn test', 'error');

    testSendBtn.classList.add('loading');
    testSendBtn.textContent = '';

    const result = await api('/test-reply', {
      method: 'POST',
      body: { message, platform }
    });

    testSendBtn.classList.remove('loading');
    testSendBtn.textContent = '🚀 Gửi test';

    const resultDiv = document.getElementById('test-result');
    const replyDiv = document.getElementById('test-reply');

    if (result && result.reply) {
      replyDiv.textContent = result.reply;
      resultDiv.style.display = 'block';
    } else {
      replyDiv.textContent = result?.error || 'Lỗi kết nối AI. Kiểm tra API key trong Settings.';
      resultDiv.style.display = 'block';
    }
  });

  // Chat simulator
  async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';

    // Add user bubble
    addChatBubble(message, 'user');

    // Add typing indicator
    const typingBubble = addChatBubble('Đang suy nghĩ...', 'typing');

    const platform = document.getElementById('test-platform').value;
    const result = await api('/test-reply', {
      method: 'POST',
      body: { message, platform }
    });

    // Remove typing indicator
    typingBubble.remove();

    if (result && result.reply) {
      addChatBubble(result.reply, 'ai');
    } else {
      addChatBubble('Lỗi: không thể kết nối AI', 'ai');
    }
  }

  chatSendBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  function addChatBubble(text, type) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  }

  // ==========================================
  // Settings
  // ==========================================
  async function loadSettings() {
    const data = await api('/settings');
    if (!data) return;
    settings = data;

    document.getElementById('setting-ai-provider').value = data.ai_provider || 'openai';
    document.getElementById('setting-ai-prompt').value = data.ai_system_prompt || '';
    document.getElementById('setting-messenger-enabled').checked = data.messenger_enabled !== 'false';
    document.getElementById('setting-instagram-enabled').checked = data.instagram_enabled !== 'false';
    document.getElementById('setting-tiktok-enabled').checked = data.tiktok_enabled !== 'false';

    globalAutoReply.checked = data.auto_reply_enabled !== 'false';

    // Update webhook URLs with current host
    const host = window.location.origin;
    document.getElementById('webhook-messenger').textContent = `${host}/webhook/messenger`;
    document.getElementById('webhook-instagram').textContent = `${host}/webhook/instagram`;
    document.getElementById('webhook-tiktok').textContent = `${host}/webhook/tiktok`;
  }

  document.getElementById('save-settings').addEventListener('click', async () => {
    const btn = document.getElementById('save-settings');
    btn.classList.add('loading');
    btn.textContent = '';

    const newSettings = {
      ai_provider: document.getElementById('setting-ai-provider').value,
      ai_system_prompt: document.getElementById('setting-ai-prompt').value,
      messenger_enabled: String(document.getElementById('setting-messenger-enabled').checked),
      instagram_enabled: String(document.getElementById('setting-instagram-enabled').checked),
      tiktok_enabled: String(document.getElementById('setting-tiktok-enabled').checked),
      auto_reply_enabled: String(globalAutoReply.checked)
    };

    const result = await api('/settings', {
      method: 'POST',
      body: newSettings
    });

    btn.classList.remove('loading');
    btn.textContent = '💾 Lưu cài đặt';

    if (result && result.success) {
      settings = result.settings;
      showToast('✅ Đã lưu cài đặt!', 'success');
    } else {
      showToast('❌ Lỗi khi lưu cài đặt', 'error');
    }
  });

  // Global auto-reply toggle
  globalAutoReply.addEventListener('change', async () => {
    await api('/settings', {
      method: 'POST',
      body: { auto_reply_enabled: String(globalAutoReply.checked) }
    });
    showToast(globalAutoReply.checked ? '🤖 Auto-Reply BẬT' : '⏸️ Auto-Reply TẮT', 'info');
  });

  // Copy webhook URLs
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.copy;
      const text = document.getElementById(targetId).textContent;
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Đã copy!', 'success');
      });
    });
  });

  // ==========================================
  // Toast Notifications
  // ==========================================
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==========================================
  // Utilities
  // ==========================================
  function platformEmoji(platform) {
    const emojis = { messenger: '💙', instagram: '💜', tiktok: '🖤' };
    return emojis[platform] || '💬';
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' phút trước';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' giờ trước';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  // ==========================================
  // Auto-refresh
  // ==========================================
  setInterval(() => {
    if (currentPage === 'dashboard') loadDashboard();
  }, 30000); // Refresh dashboard every 30s

  // ==========================================
  // Init
  // ==========================================
  async function init() {
    settings = await api('/settings') || {};
    globalAutoReply.checked = settings.auto_reply_enabled !== 'false';
    loadDashboard();
  }

  init();
})();
