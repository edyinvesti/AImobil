import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.LIBSQL_AUTH_TOKEN
  });

  try {
    const rs = await client.execute("SELECT id, title, images FROM properties LIMIT 3");
    rs.rows.forEach(r => {
      let imgs = r.images;
      if (typeof imgs === 'string') {
        try {
          const parsed = JSON.parse(imgs);
          console.log(`- ID: ${r.id} | Parsed array length: ${parsed.length} | First image length: ${parsed[0]?.length}`);
        } catch (e) {
          console.log(`- ID: ${r.id} | Failed to parse JSON. Length: ${imgs.length}`);
        }
      } else {
         console.log(`- ID: ${r.id} | Images type: ${typeof imgs}`);
      }
    });
  } catch (e) {
    console.error(e);
  }
}
run();
