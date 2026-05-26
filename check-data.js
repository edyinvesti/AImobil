import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

async function checkData() {
  try {
    const count = await client.execute("SELECT COUNT(*) as count FROM properties");
    console.log('Count:', count.rows[0].count);
    
    if (count.rows[0].count > 0) {
      const all = await client.execute("SELECT id, title, brokerCreci, broker_creci FROM properties");
      console.log('Broker IDs and CRECIs in DB:');
      all.rows.forEach(p => console.log(`- ${p.title}: id=${p.id}, brokerCreci=${p.brokerCreci}, broker_creci=${p.broker_creci}`));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkData();
