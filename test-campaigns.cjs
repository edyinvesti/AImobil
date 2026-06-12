require('dotenv').config();
const jwt = require('jsonwebtoken');

const API_URL = process.env.API_URL || 'https://aimobil.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET não configurado no .env');
  process.exit(1);
}

const token = jwt.sign({ login: process.env.TEST_LOGIN || 'edyinvesti' }, JWT_SECRET, { expiresIn: '1h' });

async function run() {
  console.log('Fetching campaigns...');
  const res = await fetch(`${API_URL}/api/marketing/campaigns`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

run().catch(console.error);
