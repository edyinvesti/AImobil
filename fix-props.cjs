require('dotenv').config();
const { createClient } = require('@libsql/client');
const { TABLES } = require('./server/db/schema.cjs');

async function fixDB() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  
  console.log('Starting properties schema repair...');
  
  try {
      console.log('Backing up properties...');
      await client.execute(`CREATE TABLE IF NOT EXISTS backup_properties AS SELECT * FROM properties`);
      
      console.log('Dropping corrupted properties table...');
      await client.execute(`PRAGMA foreign_keys = OFF`);
      await client.execute(`DROP TABLE properties`);
      
      console.log('Recreating correct properties table...');
      await client.execute(TABLES.properties);
      
      console.log('Restoring data...');
      await client.execute(`INSERT INTO properties 
        SELECT * FROM backup_properties`);
      
      console.log('Cleaning up backup...');
      await client.execute(`DROP TABLE backup_properties`);
      await client.execute(`PRAGMA foreign_keys = ON`);
      
      console.log('Done! Running PRAGMA foreign_key_check to verify...');
      const check = await client.execute(`PRAGMA foreign_key_check`);
      if (check.rows.length === 0) {
          console.log('SUCCESS! All tables are perfectly healthy now!');
      } else {
          console.log('WARNING! Still have constraint violations:', check.rows);
      }
      
  } catch(e) {
      console.log('Repair Error:', e.message);
  }
}

fixDB();
