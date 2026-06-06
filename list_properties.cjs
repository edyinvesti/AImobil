require('dotenv').config();
const { DataEngine } = require('./server/data_engine.cjs');

async function listProperties() {
  const engine = new DataEngine();
  
  // Aguarda a inicialização do cliente
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const properties = await engine.getProperties();
    console.log(`\n=== Total de Imóveis: ${properties.length} ===\n`);
    
    if (properties.length === 0) {
      console.log('Nenhum imóvel cadastrado no sistema.');
    } else {
      properties.forEach((prop, index) => {
        console.log(`${index + 1}. ID: ${prop.id}`);
        console.log(`   Título: ${prop.title}`);
        console.log(`   Tipo: ${prop.type}`);
        console.log(`   Preço: ${prop.price ? `R$ ${prop.price}` : 'N/A'}`);
        console.log(`   Localização: ${prop.location || 'N/A'}`);
        console.log(`   Status: ${prop.status}`);
        console.log(`   Quartos: ${prop.bedrooms || 0}`);
        console.log(`   Banheiros: ${prop.bathrooms || 0}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Erro ao listar imóveis:', error.message);
  }
  
  process.exit(0);
}

listProperties();
