const OpenAI = require('openai');
const axios = require('axios');
const db = require('./database');

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Generate AI reply using configured provider
 */
async function generateReply(userMessage, conversationHistory = [], platform = 'messenger') {
  const provider = db.getSetting('ai_provider') || process.env.AI_PROVIDER || 'openai';
  const systemPrompt = db.getSetting('ai_system_prompt') || process.env.AI_SYSTEM_PROMPT ||
    'Bạn là trợ lý AI thân thiện, hỗ trợ khách hàng trên fanpage. Trả lời ngắn gọn, lịch sự, bằng tiếng Việt.';

  const platformContext = {
    messenger: 'Đây là tin nhắn từ Facebook Messenger.',
    instagram: 'Đây là tin nhắn từ Instagram DM.',
    tiktok: 'Đây là tin nhắn/bình luận từ TikTok.'
  };

  const fullSystemPrompt = `${systemPrompt}\n\n${platformContext[platform] || ''}`;

  try {
    if (provider === 'gemini') {
      return await generateGeminiReply(fullSystemPrompt, userMessage, conversationHistory);
    } else {
      return await generateOpenAIReply(fullSystemPrompt, userMessage, conversationHistory);
    }
  } catch (error) {
    console.error(`[AI Engine] Error generating reply:`, error.message);
    return 'Xin lỗi, hiện tại hệ thống đang bận. Vui lòng thử lại sau!';
  }
}

async function generateOpenAIReply(systemPrompt, userMessage, conversationHistory) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI API key not configured');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (last 10 messages for context)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.direction === 'incoming' ? 'user' : 'assistant',
      content: msg.direction === 'incoming' ? msg.message_text : msg.reply_text
    });
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 500,
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}

async function generateGeminiReply(systemPrompt, userMessage, conversationHistory) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Build conversation parts
  const contents = [];

  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.direction === 'incoming' ? 'user' : 'model',
      parts: [{ text: msg.direction === 'incoming' ? msg.message_text : msg.reply_text }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const response = await ai.models.generateContent({
    model: model,
    contents: contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
    }
  });

  if (response.text) {
    return response.text.trim();
  }

  throw new Error('Empty response from Gemini');
}

/**
 * Check if auto-reply is enabled
 */
function isAutoReplyEnabled() {
  const setting = db.getSetting('auto_reply_enabled');
  return setting === 'true';
}

module.exports = {
  generateReply,
  isAutoReplyEnabled
};
