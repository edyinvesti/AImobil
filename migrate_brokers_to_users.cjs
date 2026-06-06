require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

async function migrateBrokers() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.log('Credenciais TURSO não encontradas');
    return;
  }

  const client = createClient({ url, authToken });
  
  try {
    // Buscar todos os brokers
    const brokersRs = await client.execute('SELECT * FROM brokers');
    
    console.log(`\n=== Migrando ${brokersRs.rows.length} brokers para users ===\n`);
    
    for (const broker of brokersRs.rows) {
      const login = broker.creci; // Usar CRECI como login
      const password = broker.creci; // Usar CRECI como senha inicial
      const hash = await bcrypt.hash(password, 10);
      
      try {
        // Verificar se usuário já existe
        const existing = await client.execute({
          sql: 'SELECT login FROM users WHERE login = ?',
          args: [login]
        });
        
        if (existing.rows.length === 0) {
          // Inserir novo usuário
          await client.execute({
            sql: `INSERT INTO users (login, password, name, email, phone) VALUES (?, ?, ?, ?, ?)`,
            args: [login, hash, broker.name, broker.email, broker.phone]
          });
          console.log(`✅ Usuário criado: ${login} - ${broker.name}`);
        } else {
          console.log(`⚠️  Usuário já existe: ${login}`);
        }
      } catch (e) {
        console.error(`❌ Erro ao criar usuário ${login}:`, e.message);
      }
    }
    
    console.log('\n=== Migração concluída ===');
    
    // Verificar usuários criados
    const usersRs = await client.execute('SELECT login, name FROM users');
    console.log(`\nTotal de usuários na tabela users: ${usersRs.rows.length}`);
    
  } catch (error) {
    console.error('Erro na migração:', error.message);
  }
  
  process.exit(0);
}

migrateBrokers();
