require('dotenv').config();
const {createClient} = require('@libsql/client');
(async()=>{
  const c = createClient({url:process.env.DATABASE_URL, authToken:process.env.LIBSQL_AUTH_TOKEN});
  try {
    const r = await c.execute("SELECT id, title, substr(images, 3, 8000) as thumb FROM properties WHERE broker_creci = '987456-F' LIMIT 4");
    r.rows.forEach(p => {
      const len = p.thumb ? p.thumb.length : 0;
      console.log(p.id + ' | ' + p.title + ' | thumb: ' + len + ' chars | starts: ' + (p.thumb ? p.thumb.substring(0, 30) : 'null'));
    });
  } catch(e) {
    console.log('ERRO:', e.message);
  }
})();
