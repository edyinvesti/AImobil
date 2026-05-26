import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

const userCreci = '987456-F';

const result = await client.execute({ 
  sql: "SELECT id, title, broker_creci FROM properties WHERE broker_creci IS NULL OR broker_creci = ''", 
  args: [] 
});

console.log('Properties to update:', result.rows.length);
console.log('IDs:', result.rows.map(r => r.id));

for (const prop of result.rows) {
  await client.execute({
    sql: "UPDATE properties SET broker_creci = ? WHERE id = ?",
    args: [userCreci, prop.id]
  });
  console.log('Updated:', prop.title);
}

const verify = await client.execute({ sql: "SELECT id, title, broker_creci FROM properties LIMIT 5", args: [] });
console.log('\nVerifying:');
console.log(JSON.stringify(verify.rows, null, 2));