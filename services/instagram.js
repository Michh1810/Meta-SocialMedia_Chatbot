const axios = require('axios');
const db = require('./database');
const aiEngine = require('./aiEngine');

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

/**
 * Handle incoming Instagram webhook events
 * Instagram uses the same webhook infrastructure as Messenger (via Facebook Graph API)
 */
async function handleWebhook(req, res) {
  const body = req.body;

  if (body.object !== 'instagram') {
    return res.sendStatus(404);
  }

  // Return 200 immediately
  res.sendStatus(200);

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (event.message && !event.message.is_echo) {
        await handleIncomingMessage(event);
      }
    }
  }
}

/**
 * Process incoming Instagram DM and auto-reply
 */
async function handleIncomingMessage(event) {
  const senderId = event.sender.id;
  const messageText = event.message.text;

  if (!messageText) return;

  const conversationId = `instagram_${senderId}`;

  // Get sender info
  let senderName = '';
  try {
    const profile = await getSenderProfile(senderId);
    senderName = profile.username || profile.name || '';
  } catch (e) {
    console.warn('[Instagram] Could not get sender profile:', e.message);
  }

  // Log incoming message
  db.logMessage({
    platform: 'instagram',
    senderId,
    senderName,
    messageText,
    direction: 'incoming',
    conversationId
  });

  console.log(`[Instagram] 📩 ${senderName || senderId}: ${messageText}`);

  // Check if auto-reply is enabled
  if (!aiEngine.isAutoReplyEnabled()) return;
  if (db.getSetting('instagram_enabled') !== 'true') return;

  try {
    const history = db.getConversationMessages(conversationId);
    const replyText = await aiEngine.generateReply(messageText, history, 'instagram');

    await sendMessage(senderId, replyText);

    db.logMessage({
      platform: 'instagram',
      senderId,
      senderName,
      messageText: replyText,
      replyText,
      direction: 'outgoing',
      conversationId
    });

    console.log(`[Instagram] 🤖 Reply: ${replyText}`);
  } catch (error) {
    console.error('[Instagram] Error processing message:', error.message);
  }
}

/**
 * Send message via Instagram Messaging API
 */
async function sendMessage(recipientId, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('FB_PAGE_ACCESS_TOKEN not configured');

  await axios.post(`${GRAPH_API_URL}/me/messages`, {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE'
  }, {
    params: { access_token: token }
  });
}

/**
 * Get Instagram sender profile
 */
async function getSenderProfile(userId) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('FB_PAGE_ACCESS_TOKEN not configured');

  const { data } = await axios.get(`${GRAPH_API_URL}/${userId}`, {
    params: {
      fields: 'username,name,profile_picture_url',
      access_token: token
    }
  });
  return data;
}

module.exports = {
  handleWebhook
};
