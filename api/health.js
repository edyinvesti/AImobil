import { getLeads } from './_lib/db.js';

export default async function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL ? 'configured' : 'missing';
  let dbStatus = 'waiting';
  try {
    await getLeads();
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }

  res.json({
    app: 'IAmobil Gestor',
    version: '1.0.0',
    status: 'online',
    db_status: dbStatus,
    platform: 'vercel-functions',
    timestamp: new Date().toISOString(),
    env: {
      database_url: dbUrl,
      libsql_auth_token: !!process.env.LIBSQL_AUTH_TOKEN,
      telegram_bot_token: !!process.env.TELEGRAM_BOT_TOKEN,
      gemini_api_key: !!process.env.GEMINI_API_KEY,
      groq_api_key: !!process.env.GROQ_API_KEY
    }
  });
}

