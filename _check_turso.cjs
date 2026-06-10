// Check all properties in the database with their broker info
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DB_URL || 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: process.env.TURSO_DB_TOKEN
});

async function main() {
  const rs = await db.execute('SELECT id, title, brokerCreci, broker_creci, brokerLogin, broker_login FROM properties ORDER BY id');
  console.log('Total properties:', rs.rows.length);
  for (const r of rs.rows) {
    console.log(`${r.id} | ${(r.title || '').substring(0, 30).padEnd(30)} | CRECI: ${r.brokerCreci || '-'} / ${r.broker_creci || '-'} | LOGIN: ${r.brokerLogin || '-'} / ${r.broker_login || '-'}`);
  }
}
main().catch(e => console.error(e));
