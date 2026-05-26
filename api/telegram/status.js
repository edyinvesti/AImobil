export default function handler(req, res) {
  res.json({
    status: 'online',
    bot_token_configured: !!process.env.TELEGRAM_BOT_TOKEN,
    gemini_configured: !!process.env.GEMINI_API_KEY,
    groq_configured: !!process.env.GROQ_API_KEY,
    db_configured: !!process.env.DATABASE_URL,
    platform: 'vercel-functions',
    timestamp: new Date().toISOString()
  });
}
