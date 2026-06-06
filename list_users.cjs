require('dotenv').config();
const { createClient } = require('@libsql/client');

async function listUsers() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.log('Credenciais TURSO não encontradas');
    return;
  }

  const client = createClient({ url, authToken });
  
  try {
    const rs = await client.execute('SELECT login, name, email, phone, created_at FROM users');
    
    if (rs.rows.length === 0) {
      console.log('❌ Nenhum usuário cadastrado no sistema');
    } else {
      console.log(`\n=== Total de Usuários: ${rs.rows.length} ===\n`);
      rs.rows.forEach((user, index) => {
        console.log(`${index + 1}. Login: ${user.login}`);
        console.log(`   Nome: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Telefone: ${user.phone}`);
        console.log(`   Criado em: ${user.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Erro ao listar usuários:', error.message);
  }
  
  process.exit(0);
}

listUsers();
