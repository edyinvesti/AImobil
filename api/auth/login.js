import { validateUser } from '../_lib/db.js';

export default async function handler(req, res) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'login e senha são obrigatórios' });
  }

  try {
    const user = await validateUser(login, password);
    if (!user) {
      return res.status(401).json({ error: 'login ou senha incorretos' });
    }
    // Simple token with expiration (24 hours)
    const token = Buffer.from(`${user.login}:${Date.now() + 24 * 60 * 60 * 1000}`).toString('base64');
    return res.json({ success: true, token, user: { login: user.login, name: user.name, email: user.email, phone: user.phone } });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
}
