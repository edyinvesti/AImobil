require('dotenv').config();
const { createClient } = require('@libsql/client');

async function testDB() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  try {
      const rs = await client.execute(`SELECT id, title, broker_login, broker_creci FROM properties`);
      console.log('--- ALL PROPERTIES ---');
      for (const r of rs.rows) {
          console.log(`${r.id} | ${r.title} | LOGIN: ${r.broker_login} | CRECI: ${r.broker_creci}`);
      }
  } catch(e) {
      console.log('Error', e.message);
  }
}
testDB();
