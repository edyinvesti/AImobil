import { createClient } from '@libsql/client';
import 'dotenv/config';

const client = createClient({
  url: process.env.DATABASE_URL || 'file:data/iamobil.db',
  authToken: process.env.LIBSQL_AUTH_TOKEN || ''
});

async function run() {
  try {
    const rs = await client.execute(`SELECT id, title, json_extract(images, '$[0]') as thumbnail FROM properties LIMIT 5`);
    console.log(rs.rows.map(row => ({id: row.id, hasThumbnail: !!row.thumbnail})));
  } catch(e) {
    console.error(e);
  }
}
run();
