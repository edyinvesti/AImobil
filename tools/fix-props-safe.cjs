require('dotenv').config();
const { createClient } = require('@libsql/client');
const { TABLES } = require('./server/db/schema.cjs');

async function fixDB() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  
  try {
      console.log('1. Dropping old backup if exists...');
      await client.execute(`DROP TABLE IF EXISTS backup_properties`);
      
      console.log('2. Creating backup manually...');
      await client.execute(`CREATE TABLE backup_properties (
         id TEXT PRIMARY KEY, title TEXT, type TEXT, price REAL, location TEXT, city TEXT, neighborhood TEXT,
         bedrooms INTEGER, bathrooms INTEGER, parkingSpaces INTEGER, area REAL, sizeUnit TEXT, status TEXT,
         images TEXT, suites INTEGER, livingRooms INTEGER, kitchens INTEGER, zipCode TEXT, state TEXT,
         streetNumber TEXT, complement TEXT, description TEXT, brokerName TEXT, broker_creci TEXT,
         thumbnail TEXT, created_at INTEGER, broker_login TEXT, video_data TEXT, video_type TEXT,
         offer_type TEXT, amenities TEXT, latitude REAL, longitude REAL, marketing_option TEXT)`);
         
      console.log('3. Backing up data...');
      await client.execute(`INSERT INTO backup_properties SELECT * FROM properties`);
      
      console.log('4. Disabling FKs and dropping broken properties table...');
      await client.execute(`PRAGMA foreign_keys = OFF`);
      await client.execute(`DROP TABLE properties`);
      
      console.log('5. Recreating clean properties table...');
      await client.execute(TABLES.properties);
      
      console.log('6. Restoring data...');
      await client.execute(`INSERT INTO properties SELECT * FROM backup_properties`);
      
      console.log('7. Cleaning up...');
      await client.execute(`DROP TABLE backup_properties`);
      await client.execute(`PRAGMA foreign_keys = ON`);
      
      const check = await client.execute(`PRAGMA foreign_key_check`);
      if (check.rows.length === 0) {
          console.log('SUCCESS! All database constraints are healthy!');
      } else {
          console.log('Still have violations:', check.rows);
      }
      process.exit(0);
  } catch(e) {
      console.log('Repair Error:', e.message);
      process.exit(1);
  }
}

fixDB();
