require('dotenv').config();
const { createClient } = require('@libsql/client');

async function checkUser() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.log('Credenciais TURSO não encontradas');
    return;
  }

  const client = createClient({ url, authToken });
  
  try {
    const rs = await client.execute({
      sql: 'SELECT * FROM brokers WHERE login = ? OR creci = ?',
      args: ['232120', '232120']
    });
    
    if (rs.rows.length === 0) {
      console.log('❌ Usuário "232120" não encontrado no banco de dados');
    } else {
      const user = rs.rows[0];
      console.log('✅ Usuário encontrado:');
      console.log(`   Login: ${user.login}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Telefone: ${user.phone}`);
      console.log(`   Criado em: ${user.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : 'N/A'}`);
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error.message);
  }
  
  process.exit(0);
}

checkUser();
