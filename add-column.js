import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

try {
  await client.execute({ sql: "ALTER TABLE properties ADD COLUMN broker_creci TEXT DEFAULT ''", args: [] });
  console.log('Column added!');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('Column already exists');
  } else {
    console.error('Error:', e.message);
  }
}

const rs = await client.execute({ sql: "SELECT COUNT(*) as cnt FROM properties", args: [] });
console.log('Total properties:', rs.rows[0].cnt);