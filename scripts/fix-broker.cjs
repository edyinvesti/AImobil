// Fix broker name in Turso
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@libsql/client');

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.error('Missing TURSO credentials in .env');
    process.exit(1);
  }

  const client = createClient({ url, authToken: token });

  try {
    // Check current brokers
    const before = await client.execute('SELECT creci, login, name, email FROM brokers');
    console.log('Brokers antes:', JSON.stringify(before.rows, null, 2));

    // Update broker 232120
    const result = await client.execute({
      sql: 'UPDATE brokers SET name = ?, email = ? WHERE creci = ?',
      args: ['edyinvesti', 'edy@aimobil.com', '232120']
    });
    console.log(`\nUpdate: ${result.rowsAffected} linha(s) afetada(s)`);

    // Verify
    const after = await client.execute('SELECT creci, login, name, email FROM brokers');
    console.log('\nBrokers depois:', JSON.stringify(after.rows, null, 2));
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    client.close();
  }
}

main();
