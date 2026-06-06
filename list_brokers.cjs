require('dotenv').config();
const { DataEngine } = require('./server/data_engine.cjs');

async function listBrokers() {
  const engine = new DataEngine();
  
  // Aguarda a inicialização do cliente
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const brokers = await engine.getAllBrokers();
    console.log(`\n=== Total de Brokers/Agentes: ${brokers.length} ===\n`);
    
    if (brokers.length === 0) {
      console.log('Nenhum broker cadastrado no sistema.');
    } else {
      brokers.forEach((broker, index) => {
        console.log(`${index + 1}. CRECI: ${broker.creci}`);
        console.log(`   Nome: ${broker.name}`);
        console.log(`   Email: ${broker.email || 'N/A'}`);
        console.log(`   Telefone: ${broker.phone || 'N/A'}`);
        console.log(`   Foto: ${broker.photo ? 'Sim' : 'Não'}`);
        console.log(`   Última atividade: ${broker.lastActive || 'N/A'}`);
        console.log(`   Criado em: ${broker.created_at ? new Date(broker.created_at).toLocaleString('pt-BR') : 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Erro ao listar brokers:', error.message);
  }
  
  process.exit(0);
}

listBrokers();
