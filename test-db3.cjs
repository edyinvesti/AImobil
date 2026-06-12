require('dotenv').config();
const { createClient } = require('@libsql/client');

async function testDB() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  try {
      const orphans = await client.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name = 'properties'`);
      console.log(orphans.rows[0].sql);
  } catch(e) {
      console.log('Error', e.message);
  }
}
testDB();
