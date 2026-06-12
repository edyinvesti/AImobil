require('dotenv').config();
const { createClient } = require('@libsql/client');
const { TABLES } = require('./server/db/schema.cjs');

async function fixDB() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  
  console.log('Starting schema repair...');
  
  try {
      // 1. Back up data
      console.log('Backing up appointments...');
      await client.execute(`CREATE TABLE IF NOT EXISTS backup_appointments AS SELECT * FROM appointments`);
      
      // 2. Drop the corrupted table
      console.log('Dropping corrupted appointments table...');
      await client.execute(`PRAGMA foreign_keys = OFF`);
      await client.execute(`DROP TABLE appointments`);
      
      // 3. Recreate with correct schema
      console.log('Recreating correct appointments table...');
      await client.execute(TABLES.appointments);
      
      // 4. Restore data
      console.log('Restoring data...');
      await client.execute(`INSERT INTO appointments (id, lead_name, property_title, property_id, date_time, status, notes, created_at)
        SELECT id, lead_name, property_title, property_id, date_time, status, notes, created_at FROM backup_appointments`);
      
      // 5. Clean up
      console.log('Cleaning up backup...');
      await client.execute(`DROP TABLE backup_appointments`);
      await client.execute(`PRAGMA foreign_keys = ON`);
      
      console.log('Done! Running PRAGMA foreign_key_check to verify...');
      const check = await client.execute(`PRAGMA foreign_key_check`);
      if (check.rows.length === 0) {
          console.log('SUCCESS! Database constraints are now perfectly healthy.');
      } else {
          console.log('WARNING! Still have constraint violations:', check.rows);
      }
      
  } catch(e) {
      console.log('Repair Error:', e.message);
  }
}

fixDB();
