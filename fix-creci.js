import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

const userCreci = '987456-F';

const count = await client.execute({ sql: "SELECT COUNT(*) as total FROM properties", args: [] });
console.log('Total properties:', count.rows[0].total);

const updateResult = await client.execute({ 
  sql: "UPDATE properties SET broker_creci = ? WHERE broker_creci IS NULL OR broker_creci = ''", 
  args: [userCreci] 
});

console.log('Updated:', updateResult.rowsAffected, 'properties');

const verify = await client.execute({ sql: "SELECT id, title, broker_creci FROM properties LIMIT 5", args: [] });
console.log('\nVerifying (first 5):');
console.log(JSON.stringify(verify.rows, null, 2));