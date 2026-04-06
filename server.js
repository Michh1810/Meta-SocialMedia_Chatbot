require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./services/database');
const messenger = require('./services/messenger');
const instagram = require('./services/instagram');
const tiktok = require('./services/tiktok');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure database is initialized before handling requests (for Vercel)
app.use(async (req, res, next) => {
  try {
    await db.initDatabase();
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

// ==========================================
// API Routes
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recent messages
app.get('/api/messages', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const messages = db.getRecentMessages(limit);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Conversations
app.get('/api/conversations', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const conversations = db.getConversations(limit);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Conversation messages
app.get('/api/conversations/:id/messages', (req, res) => {
  try {
    const messages = db.getConversationMessages(req.params.id);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getAllSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/settings', (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      db.setSetting(key, value);
    }
    res.json({ success: true, settings: db.getAllSettings() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test AI reply
app.post('/api/test-reply', async (req, res) => {
  try {
    const { message, platform } = req.body;
    const aiEngine = require('./services/aiEngine');
    const reply = await aiEngine.generateReply(message || 'Xin chào', [], platform || 'messenger');
    res.json({ reply });
  } catch (error) {
    console.error('Test AI Endpoint Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Webhook Routes
// ==========================================

// Facebook Messenger webhook verification
app.get('/webhook/messenger', messenger.handleVerification);

// Facebook Messenger webhook
app.post('/webhook/messenger', messenger.handleWebhook);

// Instagram webhook (uses same verification as Messenger since it's on the same FB App)
app.get('/webhook/instagram', messenger.handleVerification);

// Instagram webhook
app.post('/webhook/instagram', instagram.handleWebhook);

// TikTok webhook
app.post('/webhook/tiktok', tiktok.handleWebhook);

// ==========================================
// Serve Frontend
// ==========================================
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// Start Server
// ==========================================
async function start() {
  // Initialize database first (async for sql.js)
  await db.initDatabase();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   🤖 AI Auto-Reply Tool — Fanpage Manager       ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║   🌐 Dashboard:  http://localhost:${PORT}            ║`);
    console.log(`║   📡 Messenger:  /webhook/messenger              ║`);
    console.log(`║   📸 Instagram:  /webhook/instagram              ║`);
    console.log(`║   🎵 TikTok:     /webhook/tiktok                 ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
