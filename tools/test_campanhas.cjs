require('dotenv').config();
const { createClient } = require('@libsql/client');

async function test() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  
  try {
    const rs = await client.execute('SELECT property_title, instagram_status, campaign_status FROM campaigns ORDER BY created_at DESC LIMIT 6');
    console.log(JSON.stringify(rs.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    client.close();
  }
}

test();
