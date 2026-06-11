require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

client.execute(`
  SELECT id, title, broker_login,
    CASE WHEN video_data IS NOT NULL AND video_data != '' THEN 'SIM' ELSE 'NAO' END as tem_video,
    created_at
  FROM properties
  ORDER BY created_at DESC
  LIMIT 10
`).then(r => {
  console.log('\n=== Últimos 10 imóveis (mais recente primeiro) ===');
  r.rows.forEach(row => {
    console.log(`[${row.tem_video === 'SIM' ? '📹 COM VÍDEO' : '📷 sem video'}] ${row.title} | Corretor: ${row.broker_login} | ID: ${row.id}`);
  });
  process.exit(0);
}).catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
