require('dotenv').config();
const { DataEngine } = require('./server/data_engine.cjs');

async function testD1() {
  const db = new DataEngine();
  // Since initialization happens globally in data_engine.cjs, we can just wait a bit and run a query.
  setTimeout(async () => {
    try {
      console.log('Testing getting leads...');
      const leads = await db.getLeads();
      console.log('Leads fetched successfully:', leads);
      process.exit(0);
    } catch (error) {
      console.error('Error fetching leads:', error);
      process.exit(1);
    }
  }, 3000);
}

testD1();
