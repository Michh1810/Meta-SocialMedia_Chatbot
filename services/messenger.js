const axios = require('axios');
const db = require('./database');
const aiEngine = require('./aiEngine');

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

/**
 * Handle webhook verification from Facebook
 */
function handleVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    console.log('[Messenger] Webhook verified!');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

/**
 * Handle incoming Messenger webhook events
 */
async function handleWebhook(req, res) {
  const body = req.body;

  if (body.object !== 'page') {
    return res.sendStatus(404);
  }

  // Return 200 immediately to acknowledge receipt
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
 * Process incoming message and auto-reply if enabled
 */
async function handleIncomingMessage(event) {
  const senderId = event.sender.id;
  const messageText = event.message.text;

  if (!messageText) return; // Skip non-text messages

  const conversationId = `messenger_${senderId}`;

  // Get sender profile
  let senderName = '';
  try {
    const profile = await getSenderProfile(senderId);
    senderName = profile.name || '';
  } catch (e) {
    console.warn('[Messenger] Could not get sender profile:', e.message);
  }

  // Log incoming message
  db.logMessage({
    platform: 'messenger',
    senderId,
    senderName,
    messageText,
    direction: 'incoming',
    conversationId
  });

  console.log(`[Messenger] 📩 ${senderName || senderId}: ${messageText}`);

  // Check if auto-reply is enabled
  if (!aiEngine.isAutoReplyEnabled()) return;
  if (db.getSetting('messenger_enabled') !== 'true') return;

  try {
    // Get conversation history for context
    const history = db.getConversationMessages(conversationId);

    // Generate AI reply
    const replyText = await aiEngine.generateReply(messageText, history, 'messenger');

    // Send reply
    await sendMessage(senderId, replyText);

    // Log outgoing reply
    db.logMessage({
      platform: 'messenger',
      senderId,
      senderName,
      messageText: replyText,
      replyText,
      direction: 'outgoing',
      conversationId
    });

    console.log(`[Messenger] 🤖 Reply: ${replyText}`);
  } catch (error) {
    console.error('[Messenger] Error processing message:', error.message);
  }
}

/**
 * Send message via Messenger API
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
 * Get sender profile info
 */
async function getSenderProfile(userId) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('FB_PAGE_ACCESS_TOKEN not configured');

  const { data } = await axios.get(`${GRAPH_API_URL}/${userId}`, {
    params: {
      fields: 'name,profile_pic',
      access_token: token
    }
  });
  return data;
}

module.exports = {
  handleVerification,
  handleWebhook
};
