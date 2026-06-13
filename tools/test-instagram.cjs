require('dotenv').config();
const { createClient } = require('@libsql/client');


const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID || 'SEU_INSTAGRAM_BUSINESS_ID_AQUI';
const INSTAGRAM_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || 'SEU_INSTAGRAM_ACCESS_TOKEN_AQUI';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v22.0';

async function testReels() {
  console.log('--- TESTE INSTAGRAM REELS ---');
  
  // URL from render where the video is hosted
  const API_URL = process.env.API_URL || 'https://aimobil.onrender.com';
  
  // Conectar no DB para conseguir um Prop ID valido que tem video
  console.log('Conectando no banco de dados...');
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL || 'SEU_TURSO_DATABASE_URL_AQUI',
    authToken: process.env.TURSO_AUTH_TOKEN || 'SEU_TURSO_AUTH_TOKEN_AQUI'
  });

  const rs = await turso.execute("SELECT id, title, video_type, CASE WHEN video_data IS NOT NULL THEN 1 ELSE 0 END as hasVideo FROM properties WHERE video_data IS NOT NULL AND video_data != '' LIMIT 1;");
  if (rs.rows.length === 0) {
    console.error('Nenhum imóvel com vídeo encontrado no banco de dados!');
    return;
  }
  
  const property = rs.rows[0];
  console.log(`Encontrado imóvel com vídeo: ${property.title} (ID: ${property.id})`);

  const videoUrl = `${API_URL}/api/properties/${property.id}/video`;
  console.log(`URL do Vídeo Gerada: ${videoUrl}`);

  // Tentar fazer um ping direto para a URL pela primeira vez para checar se Render serve
  const pingRes = await fetch(videoUrl);
  if (!pingRes.ok) {
    console.error(`Render falhou ao servir o vídeo (Status: ${pingRes.status})`);
    return;
  } else {
    console.log(`Sucesso: Render serviu o vídeo corretamente! Peso aproximado: ${pingRes.headers.get('content-length')} bytes`);
  }

  const legenda = `${property.title}\n\nConheça esse imóvel incrível! Agende agora sua visita.\n\n#imoveis #iamobil`;

  console.log('\\n[Meta API] Iniciando criação de mídia REELS...');
  const creationResponse = await fetch(
    `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption: legenda,
        access_token: INSTAGRAM_TOKEN
      })
    }
  );

  const creationText = await creationResponse.text();
  console.log('[Meta API] Criação Resposta HTTP', creationResponse.status);
  console.log('[Meta API] Resposta Corpo:', creationText);

  if (!creationResponse.ok) {
    return;
  }
  
  let creationData;
  try { creationData = JSON.parse(creationText); } catch(e) {}
  
  if (creationData && creationData.id) {
    console.log(`[Meta API] Reel criado com sucesso, ID: ${creationData.id}`);
    console.log('[Meta API] Aguardando 8 segundos para processamento...');
    await new Promise(r => setTimeout(r, 8000));

    console.log('[Meta API] Tentando publicar o REEL no feed...');
    const publishResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: creationData.id, access_token: INSTAGRAM_TOKEN })
      }
    );

    const publishText = await publishResponse.text();
    console.log('[Meta API] Publicação Resposta HTTP', publishResponse.status);
    console.log('[Meta API] Publicação Corpo:', publishText);
  }
}

testReels().then(() => console.log('Finalizado.')).catch(console.error);
