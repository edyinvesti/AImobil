require('dotenv').config();
const { DataEngine } = require('./server/db/index.cjs');

async function countProperties() {
  const engine = new DataEngine();
  await engine.initialize();
  
  try {
    const properties = await engine.getProperties();
    const edyProps = properties.filter(p => {
        const bl = (p.broker_login || p.brokerLogin || '').toString().toLowerCase();
        return bl === 'edyinveti';
    });
    console.log(`JSON_OUTPUT:{"total":${properties.length},"edy":${edyProps.length}}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

countProperties();
