import { createUser } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { login, password, name, email, phone } = req.body;

  if (!login || login.length < 3 || login.length > 20) {
    return res.status(400).json({ error: 'login inválido (3-20 caracteres)' });
  }
  if (!password || password.length < 6 || password.length > 100) {
    return res.status(400).json({ error: 'Senha inválida (mínimo 6 caracteres)' });
  }
  if (!name || name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Nome inválido' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const user = await createUser(login, password, name, email, phone);
    return res.status(201).json({ success: true, user: { login: user.login, name: user.name, email: user.email } });
  } catch (e) {
    if (e.message.includes('já cadastrado')) {
      return res.status(409).json({ error: e.message });
    }
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}
