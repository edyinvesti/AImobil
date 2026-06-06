require('dotenv').config();
const { createClient } = require('@libsql/client');

async function listTables() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.log('Credenciais TURSO não encontradas');
    return;
  }

  const client = createClient({ url, authToken });
  
  try {
    const rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    
    console.log(`\n=== Tabelas no banco TURSO ===\n`);
    rs.rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name}`);
    });
    
    console.log('\n=== Verificando tabela users ===');
    try {
      const usersRs = await client.execute('SELECT COUNT(*) as count FROM users');
      console.log(`Usuários na tabela users: ${usersRs.rows[0].count}`);
      
      if (usersRs.rows[0].count > 0) {
        const allUsers = await client.execute('SELECT login, name FROM users LIMIT 10');
        console.log('\nUsuários encontrados:');
        allUsers.rows.forEach(user => {
          console.log(`  - Login: ${user.login}, Nome: ${user.name}`);
        });
      }
    } catch (e) {
      console.log('Tabela users não existe ou erro:', e.message);
    }
    
  } catch (error) {
    console.error('Erro ao listar tabelas:', error.message);
  }
  
  process.exit(0);
}

listTables();
