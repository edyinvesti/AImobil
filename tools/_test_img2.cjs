require('dotenv').config();
const {createClient} = require('@libsql/client');
(async()=>{
  const c = createClient({url:process.env.DATABASE_URL, authToken:process.env.LIBSQL_AUTH_TOKEN});
  try {
    // Get first 200 chars of images to see format
    const r = await c.execute("SELECT id, title, substr(images, 1, 200) as img_start FROM properties WHERE broker_creci = '987456-F' LIMIT 1");
    r.rows.forEach(p => {
      console.log('ID:', p.id);
      console.log('Title:', p.title);
      console.log('Start:', p.img_start);
    });
  } catch(e) {
    console.log('ERRO:', e.message);
  }
})();
