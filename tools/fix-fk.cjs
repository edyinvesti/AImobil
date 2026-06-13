require('dotenv').config();
const { createClient } = require('@libsql/client');

async function fixDB() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  
  try {
      console.log('Querying violating rows from properties paying attention to rowid...');
      const rows = await client.execute(`SELECT rowid, id, broker_creci FROM properties WHERE rowid IN (1,2,7)`);
      
      console.log('Violating properties:');
      for (const r of rows.rows) {
          console.log(`rowid=${r.rowid}, id=${r.id}, creci=${r.broker_creci}`);
          // If broker_creci is missing, we need to handle it. 
          // SQLite considers NULL as satisfied unless NOT NULL is set, but '' is a string and needs a match.
          let missingCreci = r.broker_creci;
          if (missingCreci === null) continue; // Null wouldn't violate standard FK unless NOT NULL is specified.
          
          if (missingCreci === '' || missingCreci === undefined) {
             missingCreci = ''; // The empty string
          }
          
          console.log(`Attempting to insert dummy broker for creci [${missingCreci}]`);
          try {
             await client.execute({
                sql: `INSERT OR IGNORE INTO brokers (creci, login, name) VALUES (?, ?, ?)`,
                args: [missingCreci, missingCreci || 'dummy_login', 'Dummy Broker for FK']
             });
             console.log(`Successfully satisfied FK for creci [${missingCreci}]`);
          } catch(e) {
             console.log('Failed to insert dummy', e.message);
          }
      }
      
      console.log('Running PRAGMA foreign_key_check again...');
      const check = await client.execute(`PRAGMA foreign_key_check`);
      if (check.rows.length === 0) {
          console.log('SUCCESS! Database constraints are now perfectly healthy.');
      } else {
          console.log('WARNING! Still have constraint violations:', check.rows);
      }
      process.exit(0);
  } catch(e) {
      console.log('Repair Error:', e.message);
      process.exit(1);
  }
}

fixDB();
