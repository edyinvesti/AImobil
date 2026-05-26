import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.LIBSQL_AUTH_TOKEN
  });

  try {
    const rs = await client.execute("SELECT id, title, broker_creci FROM properties");
    console.log(`Found ${rs.rows.length} properties:`);
    rs.rows.forEach(r => {
      console.log(`- ID: ${r.id} | Title: ${r.title} | CRECI: ${r.broker_creci}`);
    });
  } catch (e) {
    console.error(e);
  }
}
run();
