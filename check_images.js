require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

(async() => {
  try {
    const r = await client.execute('SELECT id, title, images FROM properties');
    console.log('Total properties:', r.rows.length);
    r.rows.forEach(p => {
      if(p.images && p.images !== '[]' && p.images !== null) {
        try {
          const imgs = JSON.parse(p.images);
          console.log(`Property ${p.id} (${p.title}): ${imgs.length} images`);
          if(imgs.length > 0) {
            console.log('  First:', imgs[0]);
          }
        } catch(e) {
          console.log(`Property ${p.id}: Error parsing images: ${e.message}`);
          console.log(`  Raw images: ${p.images}`);
        }
      } else {
        console.log(`Property ${p.id} (${p.title}): No images`);
      }
    });
  } catch(err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
})();