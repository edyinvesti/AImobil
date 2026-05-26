require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

async function main() {
  // Lista todas as tabelas
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('\n📋 Tabelas no banco Turso:');
  tables.rows.forEach(r => console.log(' -', r.name));

  // Conta registros em cada tabela
  console.log('\n📊 Contagem de registros:');
  for (const row of tables.rows) {
    const count = await client.execute(`SELECT COUNT(*) as total FROM [${row.name}]`);
    console.log(` - ${row.name}: ${count.rows[0].total} registros`);
  }
}

main().catch(console.error).finally(() => process.exit());
