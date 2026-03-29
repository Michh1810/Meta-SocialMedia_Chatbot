const axios = require('axios');
const crypto = require('crypto');
const db = require('./database');
const aiEngine = require('./aiEngine');

const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2';

/**
 * Handle TikTok webhook events
 * TikTok sends various event types including direct messages and comments
 */
async function handleWebhook(req, res) {
  const body = req.body;

  // Return 200 immediately
  res.sendStatus(200);

  try {
    const eventType = body.event;

    switch (eventType) {
      case 'receive_message':
        await handleIncomingMessage(body);
        break;
      case 'receive_comment':
        await handleIncomingComment(body);
        break;
      default:
        console.log(`[TikTok] Unhandled event type: ${eventType}`);
    }
  } catch (error) {
    console.error('[TikTok] Webhook error:', error.message);
  }
}

/**
 * Handle incoming TikTok direct message
 */
async function handleIncomingMessage(body) {
  const content = body.content || {};
  const senderId = content.from_user_id || 'unknown';
  const messageText = content.text || '';
  const senderName = content.from_user_name || '';

  if (!messageText) return;

  const conversationId = `tiktok_${senderId}`;

  // Log incoming message
  db.logMessage({
    platform: 'tiktok',
    senderId,
    senderName,
    messageText,
    direction: 'incoming',
    conversationId
  });

  console.log(`[TikTok] 📩 ${senderName || senderId}: ${messageText}`);

  // Check if auto-reply is enabled
  if (!aiEngine.isAutoReplyEnabled()) return;
  if (db.getSetting('tiktok_enabled') !== 'true') return;

  try {
    const history = db.getConversationMessages(conversationId);
    const replyText = await aiEngine.generateReply(messageText, history, 'tiktok');

    // TikTok DM reply (requires special API permissions)
    await sendDirectMessage(senderId, replyText);

    db.logMessage({
      platform: 'tiktok',
      senderId,
      senderName,
      messageText: replyText,
      replyText,
      direction: 'outgoing',
      conversationId
    });

    console.log(`[TikTok] 🤖 Reply: ${replyText}`);
  } catch (error) {
    console.error('[TikTok] Error replying:', error.message);
  }
}

/**
 * Handle incoming TikTok comment
 */
async function handleIncomingComment(body) {
  const content = body.content || {};
  const senderId = content.from_user_id || 'unknown';
  const commentText = content.text || '';
  const senderName = content.from_user_name || '';
  const commentId = content.comment_id || '';

  if (!commentText) return;

  const conversationId = `tiktok_comment_${commentId}`;

  // Log incoming comment
  db.logMessage({
    platform: 'tiktok',
    senderId,
    senderName,
    messageText: `[Comment] ${commentText}`,
    direction: 'incoming',
    conversationId
  });

  console.log(`[TikTok] 💬 Comment from ${senderName || senderId}: ${commentText}`);

  // Auto-reply to comments if enabled
  if (!aiEngine.isAutoReplyEnabled()) return;
  if (db.getSetting('tiktok_enabled') !== 'true') return;

  try {
    const replyText = await aiEngine.generateReply(commentText, [], 'tiktok');

    // Reply to comment via TikTok API
    await replyToComment(commentId, replyText);

    db.logMessage({
      platform: 'tiktok',
      senderId,
      senderName,
      messageText: replyText,
      replyText,
      direction: 'outgoing',
      conversationId
    });

    console.log(`[TikTok] 🤖 Comment Reply: ${replyText}`);
  } catch (error) {
    console.error('[TikTok] Error replying to comment:', error.message);
  }
}

/**
 * Send direct message on TikTok
 */
async function sendDirectMessage(userId, text) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    console.warn('[TikTok] Client key not configured, skipping DM send');
    return;
  }

  // TikTok DM API - requires business account permissions
  await axios.post(`${TIKTOK_API_URL}/business/message/send/`, {
    recipient: { user_id: userId },
    message: { text }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
}

/**
 * Reply to a TikTok comment
 */
async function replyToComment(commentId, text) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    console.warn('[TikTok] Client key not configured, skipping comment reply');
    return;
  }

  await axios.post(`${TIKTOK_API_URL}/business/comment/reply/`, {
    comment_id: commentId,
    text
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
}

/**
 * Get TikTok access token using client credentials
 */
async function getAccessToken() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error('TikTok credentials not configured');
  }

  const { data } = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  });

  return data.access_token;
}

module.exports = {
  handleWebhook
};
