require('dotenv').config();
const { DataEngine } = require('./server/db/index.cjs');

async function findEdy() {
  const engine = new DataEngine();
  await engine.initialize();
  
  try {
    const brokers = await engine.getAllBrokers();
    const properties = await engine.getProperties();
    
    console.log('--- Brokers ---');
    brokers.forEach(b => console.log(`Login: ${b.login}, CRECI: ${b.creci}, Name: ${b.name}`));
    
    console.log('\n--- Properties ---');
    properties.forEach(p => console.log(`ID: ${p.id}, broker_login: ${p.broker_login}, brokerName: ${p.brokerName}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

findEdy();
