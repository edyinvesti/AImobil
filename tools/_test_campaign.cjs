require('dotenv').config();
const path = require('path');

async function main() {
  // 1. Add a test image to property prop-005
  const { createClient } = require('@libsql/client');
  const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

  // Criar uma imagem placeholder (1x1 pixel azul em base64)
  const placeholderImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const images = JSON.stringify([placeholderImg]);

  await c.execute({
    sql: 'UPDATE properties SET images = ?, price = 250000 WHERE id = ?',
    args: [images, 'prop-005']
  });
  console.log('✅ Imagem adicionada ao prop-005');

  // Verify
  const r = await c.execute("SELECT id, title, images FROM properties WHERE id = 'prop-005'");
  const prop = r.rows[0];
  const imgCount = prop.images ? JSON.parse(prop.images).length : 0;
  console.log(`📸 ${prop.title}: ${imgCount} imagem(ns)`);

  // 2. Try creating the campaign via MarketingEngine
  console.log('\n🚀 Iniciando campanha de teste...');
  const { MarketingEngine } = require(path.join(__dirname, 'server/marketing-engine.cjs'));
  const engine = new MarketingEngine();

  const result = await engine.criarCampanha('prop-005', {
    includeAds: false,
    includeOrganic: true,
    budget: 10,
    campaignDays: 7
  });

  console.log('\n📊 Resultado da campanha:');
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
