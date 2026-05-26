import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

async function checkDb() {
  try {
    const result = await client.execute({ sql: "SELECT name FROM sqlite_master WHERE type='table'", args: [] });
    console.log('Tables:', result.rows.map(r => r.name));

    for (const table of result.rows.map(r => r.name)) {
      const count = await client.execute({ sql: `SELECT COUNT(*) as count FROM ${table}`, args: [] });
      console.log(`  ${table}: ${count.rows[0].count} rows`);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkDb();