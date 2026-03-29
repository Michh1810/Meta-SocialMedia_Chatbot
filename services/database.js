const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const isVercel = process.env.VERCEL === '1';
const DB_PATH = isVercel ? path.join('/tmp', 'data.db') : path.join(__dirname, '..', 'data.db');

let db = null;
let SQL = null;
let initPromise = null;

async function initDatabase() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    initTables();
    return db;
  })();

  return initPromise;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT DEFAULT '',
      message_text TEXT NOT NULL,
      reply_text TEXT DEFAULT '',
      direction TEXT NOT NULL DEFAULT 'incoming',
      conversation_id TEXT DEFAULT '',
      timestamp DATETIME DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT DEFAULT '',
      last_message TEXT DEFAULT '',
      last_reply TEXT DEFAULT '',
      message_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Default settings
  const defaults = {
    auto_reply_enabled: 'true',
    ai_provider: process.env.AI_PROVIDER || 'openai',
    ai_system_prompt: process.env.AI_SYSTEM_PROMPT || 'Bạn là trợ lý AI thân thiện, hỗ trợ khách hàng trên fanpage. Trả lời ngắn gọn, lịch sự, bằng tiếng Việt.',
    messenger_enabled: 'true',
    instagram_enabled: 'true',
    tiktok_enabled: 'true'
  };

  for (const [key, value] of Object.entries(defaults)) {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }

  saveDb();
}

function getSetting(key) {
  const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return null;
}

function setSetting(key, value) {
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
  saveDb();
}

function getAllSettings() {
  const result = db.exec('SELECT key, value FROM settings');
  const settings = {};
  if (result.length > 0) {
    for (const row of result[0].values) {
      settings[row[0]] = row[1];
    }
  }
  return settings;
}

function logMessage({ platform, senderId, senderName, messageText, replyText, direction, conversationId }) {
  db.run(`
    INSERT INTO messages (platform, sender_id, sender_name, message_text, reply_text, direction, conversation_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [platform, senderId, senderName || '', messageText, replyText || '', direction, conversationId || '']);

  // Upsert conversation
  if (conversationId) {
    const existing = db.exec('SELECT id FROM conversations WHERE id = ?', [conversationId]);

    if (existing.length > 0 && existing[0].values.length > 0) {
      if (direction === 'incoming') {
        db.run(`UPDATE conversations SET last_message = ?, message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?`,
          [messageText, conversationId]);
      } else {
        db.run(`UPDATE conversations SET last_reply = ?, message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?`,
          [replyText || messageText, conversationId]);
      }
    } else {
      db.run(`INSERT INTO conversations (id, platform, sender_id, sender_name, last_message, last_reply, message_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
        [conversationId, platform, senderId, senderName || '', messageText, replyText || '']);
    }
  }

  saveDb();
}

function getRecentMessages(limit = 50) {
  const result = db.exec(`SELECT id, platform, sender_id, sender_name, message_text, reply_text, direction, conversation_id, timestamp FROM messages ORDER BY timestamp DESC LIMIT ?`, [limit]);
  return resultToObjects(result, ['id', 'platform', 'sender_id', 'sender_name', 'message_text', 'reply_text', 'direction', 'conversation_id', 'timestamp']);
}

function getConversations(limit = 50) {
  const result = db.exec(`SELECT id, platform, sender_id, sender_name, last_message, last_reply, message_count, updated_at FROM conversations ORDER BY updated_at DESC LIMIT ?`, [limit]);
  return resultToObjects(result, ['id', 'platform', 'sender_id', 'sender_name', 'last_message', 'last_reply', 'message_count', 'updated_at']);
}

function getConversationMessages(conversationId) {
  const result = db.exec(`SELECT id, platform, sender_id, sender_name, message_text, reply_text, direction, conversation_id, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC`, [conversationId]);
  return resultToObjects(result, ['id', 'platform', 'sender_id', 'sender_name', 'message_text', 'reply_text', 'direction', 'conversation_id', 'timestamp']);
}

function getStats() {
  const totalResult = db.exec('SELECT COUNT(*) FROM messages');
  const totalMessages = totalResult.length > 0 ? totalResult[0].values[0][0] : 0;

  const convResult = db.exec('SELECT COUNT(*) FROM conversations');
  const totalConversations = convResult.length > 0 ? convResult[0].values[0][0] : 0;

  const todayResult = db.exec("SELECT COUNT(*) FROM messages WHERE DATE(timestamp) = DATE('now')");
  const todayMessages = todayResult.length > 0 ? todayResult[0].values[0][0] : 0;

  const platformResult = db.exec('SELECT platform, COUNT(*) as count FROM messages GROUP BY platform');
  const platformStats = {};
  if (platformResult.length > 0) {
    for (const row of platformResult[0].values) {
      platformStats[row[0]] = row[1];
    }
  }

  return { totalMessages, totalConversations, todayMessages, platformStats };
}

// Helper: convert sql.js result to array of objects
function resultToObjects(result, columns) {
  if (!result.length || !result[0].values.length) return [];
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

module.exports = {
  initDatabase,
  getDb,
  getSetting,
  setSetting,
  getAllSettings,
  logMessage,
  getRecentMessages,
  getConversations,
  getConversationMessages,
  getStats
};
