require('dotenv').config();
const { createClient } = require('@libsql/client');

async function listBrokers() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.log('Credenciais TURSO não encontradas');
    return;
  }

  const client = createClient({ url, authToken });
  
  try {
    const rs = await client.execute('SELECT * FROM brokers');
    
    if (rs.rows.length === 0) {
      console.log('❌ Nenhum broker cadastrado na tabela brokers');
    } else {
      console.log(`\n=== Total de Brokers: ${rs.rows.length} ===\n`);
      rs.rows.forEach((broker, index) => {
        console.log(`${index + 1}. CRECI: ${broker.creci}`);
        console.log(`   Nome: ${broker.name}`);
        console.log(`   Email: ${broker.email}`);
        console.log(`   Telefone: ${broker.phone}`);
        console.log(`   Login: ${broker.login || 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Erro ao listar brokers:', error.message);
  }
  
  process.exit(0);
}

listBrokers();
