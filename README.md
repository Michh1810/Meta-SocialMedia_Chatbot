# Auto Reply Tool

An AI-powered auto-reply bot for Facebook Messenger, Instagram, and TikTok fanpages. When a customer messages your page, the bot automatically replies using OpenAI or Google Gemini. Manage everything through a web dashboard.

---

## Installation

**1. Clone the project to your Desktop**
```bash
cd ~/Desktop
git clone https://github.com/Michh1810/auto-reply-tool.git
cd auto-reply-tool
```

**2. Install dependencies**
```bash
npm install
```

**3. Create a `.env` file in the project root**
```bash
cp .env.example .env
```
Then open `.env` and fill in your API keys:
```
OPENAI_API_KEY=your-openai-key-here
# or use Gemini instead:
GEMINI_API_KEY=your-gemini-key-here
AI_PROVIDER=openai

PAGE_ACCESS_TOKEN=your-facebook-page-token
VERIFY_TOKEN=any-string-you-choose
```

---

## Run It

**Development (auto-restarts when you save files):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Then open your browser and go to:
```
http://localhost:3000
```

You should see the dashboard.

---

## Project Structure

```
auto-reply-tool/
├── server.js          # Entry point — starts the server
├── package.json       # Project config and dependencies
├── services/
│   ├── aiEngine.js    # Generates AI replies (OpenAI or Gemini)
│   ├── database.js    # Stores conversations and settings
│   ├── messenger.js   # Facebook Messenger webhook
│   ├── instagram.js   # Instagram DM webhook
│   └── tiktok.js      # TikTok webhook
└── public/
    └── index.html     # Dashboard UI
```
