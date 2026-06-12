require('dotenv').config();
const { createClient } = require('@libsql/client');

async function testDB() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  try {
      // Set all the user's old properties to their new CRECI
      await client.execute({
          sql: `UPDATE properties SET broker_login = '232120', broker_creci = '232120' WHERE broker_login = 'edyinvesti' OR broker_login = '' OR broker_login IS NULL`,
          args: []
      });
      console.log('Successfully reassigned old properties to 232120');
  } catch(e) {
      console.log('Error', e.message);
  }
}
testDB();
