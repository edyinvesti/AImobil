import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.LIBSQL_AUTH_TOKEN
  });

  try {
    const rs = await client.execute("UPDATE properties SET broker_creci = '987456-F' WHERE id = 'b6cc813e-7cb7-4ce9-9b6c-153ba56b0c4b'");
    console.log(`Updated ${rs.rowsAffected} properties.`);
    
    // Verify
    const verifyRs = await client.execute("SELECT id, title, broker_creci FROM properties WHERE id = 'b6cc813e-7cb7-4ce9-9b6c-153ba56b0c4b'");
    console.log('Verification:', verifyRs.rows);
  } catch (e) {
    console.error(e);
  }
}
run();
