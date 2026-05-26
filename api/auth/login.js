import { validateUser } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { creci, password } = req.body;

  if (!creci || !password) {
    return res.status(400).json({ error: 'CRECI e senha são obrigatórios' });
  }

  try {
    const user = await validateUser(creci, password);
    if (!user) {
      return res.status(401).json({ error: 'CRECI ou senha incorretos' });
    }
    const token = Buffer.from(`${user.creci}:${Date.now()}`).toString('base64');
    return res.json({ success: true, token, user: { creci: user.creci, name: user.name, email: user.email, phone: user.phone } });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
}