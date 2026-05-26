import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

const result = await client.execute({ 
  sql: "SELECT id, title, broker_creci FROM properties WHERE broker_creci IS NOT NULL AND broker_creci != ''", 
  args: [] 
});

console.log('Properties with broker_creci:', result.rows.length);
console.log(JSON.stringify(result.rows, null, 2));

const allProps = await client.execute({ sql: "SELECT id, title, broker_creci FROM properties LIMIT 10", args: [] });
console.log('\nAll properties (first 10):');
console.log(JSON.stringify(allProps.rows, null, 2));