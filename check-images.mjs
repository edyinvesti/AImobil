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
      let type = typeof imgs;
      let preview = '';
      if (imgs === null) {
        preview = 'NULL';
      } else if (type === 'string') {
        preview = imgs.substring(0, 100) + (imgs.length > 100 ? '...' : '');
      } else {
        preview = 'Unknown type';
      }
      console.log(`- ID: ${r.id} | Title: ${r.title} | Images type: ${type} | Preview: ${preview}`);
    });
  } catch (e) {
    console.error(e);
  }
}
run();
