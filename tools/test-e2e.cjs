require('dotenv').config();
const fs = require('fs');
const jwt = require('jsonwebtoken');

const API_URL = process.env.API_URL || 'https://aimobil.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET não configurado no .env');
  process.exit(1);
}

const token = jwt.sign({ login: process.env.TEST_LOGIN || 'edyinvesti' }, JWT_SECRET, { expiresIn: '1h' });

async function run() {
  console.log('[1/4] Preparando payload da mídia de vídeo (MP4)...');
  const videoBuffer = fs.readFileSync('C:\\Users\\User\\Downloads\\Mega Brain\\video_teste_imovel.mp4');
  const videoBase64 = 'data:video/mp4;base64,' + videoBuffer.toString('base64');
  
  const imgBuffer = fs.readFileSync('C:\\\\Users\\\\User\\\\.gemini\\\\antigravity\\\\brain\\\\6ea727e2-5d81-439b-8238-3458aa9a5863\\\\foto_teste_imovel_1781214485934.png');
  const imgBase64 = 'data:image/png;base64,' + imgBuffer.toString('base64');

  const propertyData = {
    title: 'Casa Luxo Inteligência Artificial',
    description: 'Imóvel espetacular submetido automaticamente para testes.',
    price: 3500000,
    type: 'Casa em Condomínio',
    transactionType: 'venda',
    bedrooms: 4,
    bathrooms: 5,
    suites: 4,
    parkingSpaces: 4,
    size: 450,
    sizeUnit: 'm²',
    city: 'Goiânia',
    neighborhood: 'Alphaville',
    features: ['Piscina', 'Automação'],
    videoData: videoBase64,
    videoType: 'video/mp4',
    images: [imgBase64] 
  };

  console.log('[2/4] Enviando propriedade para AImobil (Render)...');
  const res = await fetch(`${API_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(propertyData)
  });

  if (!res.ok) {
    console.error('Erro ao salvar propriedade', await res.text());
    return;
  }
  
  const savedProp = await res.json();
  const propertyId = savedProp.id;
  console.log(`Propriedade salva com Sucesso! ID: ${propertyId}`);

  console.log('[3/4] Acionando Campanha de Marketing (Só Instagram) pelo Backend...');
  const resMarket = await fetch(`${API_URL}/api/marketing/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ property_id: propertyId, budget: 20, includeOrganic: true, includeAds: false })
  });

  if (!resMarket.ok) {
    console.error('Erro ao acionar campanha no backend!', resMarket.status, await resMarket.text());
    return;
  }

  const result = await resMarket.json();
  console.log('[4/4] Campanha de Instagram acionada com sucesso!');
  console.log('Detalhes:', JSON.stringify(result, null, 2));

  console.log('\\nTeste finalizado! O vídeo deve estar processando e chegará à aba Campanhas em breve.');
}

run().catch(console.error);
