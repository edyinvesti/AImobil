const https = require('https');

const users = [
  { login: '1808200', password: '1808200', name: 'Samuel f' },
  { login: '123456', password: '123456', name: 'Kelly Laureano' },
  { login: '232123', password: '232123', name: 'Hanny' },
  { login: '232120', password: '232120', name: 'Kaua' },
  { login: '987456-F', password: '987456-F', name: 'Edyinvesti' }
];

async function testLogin(login, password) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ login, password });
    
    const options = {
      hostname: 'aimobil.onrender.com',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ success: res.statusCode === 200, status: res.statusCode, result });
        } catch (e) {
          resolve({ success: false, status: res.statusCode, error: body });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

async function testAllLogins() {
  console.log('=== Testando todos os logins ===\n');
  
  for (const user of users) {
    console.log(`Testando: ${user.name} (${user.login})`);
    const result = await testLogin(user.login, user.password);
    
    if (result.success) {
      console.log(`✅ Sucesso - Status: ${result.status}`);
      if (result.result.token) {
        console.log(`   Token: ${result.result.token.substring(0, 50)}...`);
      }
    } else {
      console.log(`❌ Falha - Status: ${result.status}`);
      if (result.error) console.log(`   Erro: ${result.error}`);
      if (result.result) console.log(`   Result: ${JSON.stringify(result.result)}`);
    }
    console.log('');
  }
  
  console.log('=== Testes concluídos ===');
  process.exit(0);
}

testAllLogins();
