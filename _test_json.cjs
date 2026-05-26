require('dotenv').config();
const {createClient} = require('@libsql/client');
(async()=>{
  const c = createClient({url:process.env.DATABASE_URL, authToken:process.env.LIBSQL_AUTH_TOKEN});
  try {
    const r = await c.execute("SELECT id, title, json_extract(images, '$[0]') as first_img FROM properties WHERE images IS NOT NULL AND images != '[]' AND broker_creci = '987456-F' LIMIT 5");
    r.rows.forEach(p => {
      const len = p.first_img ? p.first_img.length : 0;
      console.log(p.id + ' | ' + p.title + ' | ' + len + ' chars');
    });
  } catch(e) {
    console.log('ERRO:', e.message);
  }
})();
