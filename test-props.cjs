const jwt = require('jsonwebtoken');

const API_URL = 'https://aimobil.onrender.com';
const JWT_SECRET = 'jzxVAHvDY2XOB0NFcQg8qhTlUJin4E6wCItb3RLuZGkmfysoKdp7r9a1SMW5Pe'; 

const token = jwt.sign({ login: 'edyinvesti' }, JWT_SECRET, { expiresIn: '1h' });

async function run() {
  console.log('Fetching properties...');
  const res = await fetch(`${API_URL}/api/properties`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text.substring(0, 500));
}

run().catch(console.error);
