const { createClient } = require('@libsql/client');
require('dotenv').config({ path: 'c:/Users/User/Downloads/iamobil-gestor/.env' });

async function main() {
  const client = createClient({ 
    url: process.env.DATABASE_URL,
    authToken: process.env.LIBSQL_AUTH_TOKEN
  });

  const props = await client.execute('SELECT id, title, images FROM properties LIMIT 5');
  console.log('--- IMÓVEIS (Primeiros 5) ---');
  props.rows.forEach(r => {
    let imgs = [];
    try { imgs = JSON.parse(r.images || '[]'); } catch(e){}
    console.log(`[${r.id}] ${r.title}: ${imgs.length} fotos encontradas.`);
    imgs.forEach((img, i) => console.log(`  Foto ${i+1}: ${img}`));
  });

  const brokers = await client.execute('SELECT creci, name, photo FROM brokers LIMIT 5');
  console.log('\n--- CORRETORES (Primeiros 5) ---');
  brokers.rows.forEach(r => {
    console.log(`[${r.creci}] ${r.name}: Foto -> ${r.photo || 'Nenhuma'}`);
  });
}
main().catch(console.error);
