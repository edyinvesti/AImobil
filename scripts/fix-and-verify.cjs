require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@libsql/client');

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  
  console.log('URL:', url);
  console.log('Token (first 20):', token?.substring(0, 20) + '...');
  
  const client = createClient({ url, authToken: token });

  // Check before
  const before = await client.execute('SELECT creci, name, email FROM brokers');
  console.log('\nAntes:', JSON.stringify(before.rows));

  // Update
  const result = await client.execute({
    sql: 'UPDATE brokers SET name = ?, email = ? WHERE creci = ?',
    args: ['edyinvesti', 'edy@aimobil.com', '232120']
  });
  console.log('Update:', result.rowsAffected, 'linha(s)');

  // Check after with same client
  const after = await client.execute('SELECT creci, name, email FROM brokers');
  console.log('Depois:', JSON.stringify(after.rows));

  // Check with new client
  const c2 = createClient({ url, authToken: token });
  const verify = await c2.execute('SELECT creci, name, email FROM brokers');
  console.log('Verificacao (nova conexao):', JSON.stringify(verify.rows));
  c2.close();

  client.close();
}

main().catch(console.error);
