require('dotenv').config();
const { createClient } = require('@libsql/client');

async function testDB() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  if(!tursoUrl) {
      console.log('No TURSO_DATABASE_URL');
      return;
  }
  
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  
  // Try the migration
  const queries = [
    `UPDATE campaigns SET instagram_status = 'PUBLISHED' WHERE instagram_status = 'published'`,
    `UPDATE campaigns SET instagram_status = 'DRAFT' WHERE instagram_status = 'draft'`,
    `UPDATE campaigns SET campaign_status = 'ACTIVE' WHERE campaign_status = 'active'`,
    `UPDATE campaigns SET campaign_status = 'PENDING' WHERE campaign_status = 'pending'`,
    `UPDATE campaigns SET campaign_status = 'ERROR' WHERE campaign_status = 'error'`,
  ];

  for (const sql of queries) {
    try {
      await client.execute({ sql, args: [] });
      console.log('SUCCESS:', sql);
    } catch (e) {
      console.log('ERROR:', e.message, 'ON', sql);
    }
  }
  
  // Find orphans
  try {
      const orphans = await client.execute(`SELECT * FROM campaigns WHERE property_id NOT IN (SELECT id FROM properties)`);
      console.log(`FOUND ${orphans.rows.length} orphaned campaigns.`);
      for(let r of orphans.rows) {
          console.log(`Orphan Campaign: ${r.id} for property ${r.property_id}`);
      }
  } catch(e) {
      console.log('Orphan check error', e.message);
  }
}

testDB();
