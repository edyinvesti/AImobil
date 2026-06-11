require('dotenv').config();
const { createClient } = require('@libsql/client');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Missing TURSO credentials in .env');
  process.exit(1);
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function cleanup() {
  console.log('=== Cleanup: Remover tabela users ===\n');

  // 1. Verificar se a tabela users existe
  const check = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );

  if (check.rows.length === 0) {
    console.log('Tabela users ja nao existe — nada a fazer.');
  } else {
    // 2. Contar quantos registros serao afetados
    const count = await client.execute('SELECT COUNT(*) as count FROM users');
    console.log(`Registros na tabela users: ${count.rows[0].count}`);

    // 3. Verificar se todos os users ja foram migrados para brokers
    const missing = await client.execute(`
      SELECT u.login FROM users u
      WHERE u.login NOT IN (SELECT COALESCE(login, '') FROM brokers WHERE login IS NOT NULL)
    `);

    if (missing.rows.length > 0) {
      console.log('AVISO: Estes logins estao em users mas NAO em brokers:');
      for (const row of missing.rows) {
        console.log(`  - ${row.login}`);
      }
      console.log('\nMigre-os primeiro ou interrompa (Ctrl+C) e execute restore-data.cjs');
      console.log('Continuando em 5 segundos...');
      await new Promise(r => setTimeout(r, 5000));
    } else {
      console.log('OK: Todos os users existem em brokers.');
    }

    // 4. Dropar a tabela
    await client.execute('DROP TABLE users');
    console.log('Tabela users removida com sucesso.');
  }

  // 5. Corrigir leads.property_id de INTEGER para TEXT
  console.log('\n=== Corrigir leads.property_id ===\n');

  // Turso (libSQL) nao suporta ALTER TABLE ALTER COLUMN diretamente
  // Criamos uma tabela nova, copiamos dados, dropamos a antiga e renomeamos
  const tableInfo = await client.execute("PRAGMA table_info('leads')");
  const hasPropertyId = tableInfo.rows.find(r => r.name === 'property_id');
  const propertyIdType = hasPropertyId ? hasPropertyId.type : null;

  if (propertyIdType && propertyIdType.toUpperCase() === 'INTEGER') {
    console.log('Corrigindo leads.property_id de INTEGER para TEXT...');

    await client.execute(`
      CREATE TABLE leads_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        interest TEXT,
        notes TEXT,
        score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'novo',
        date TEXT,
        potential_value INTEGER,
        property_id TEXT,
        last_contacted TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (property_id) REFERENCES properties(id)
      )
    `);

    await client.execute(`
      INSERT INTO leads_new (id, name, phone, interest, notes, score, status, date, potential_value, property_id, last_contacted, created_at)
      SELECT id, name, phone, interest, notes, score, status, date, potential_value, CAST(property_id AS TEXT), last_contacted, created_at FROM leads
    `);

    await client.execute('DROP TABLE leads');
    await client.execute('ALTER TABLE leads_new RENAME TO leads');
    console.log('leads.property_id corrigido para TEXT.');
  } else if (propertyIdType && propertyIdType.toUpperCase() === 'TEXT') {
    console.log('leads.property_id ja e TEXT — nada a fazer.');
  } else {
    console.log('Tabela leads nao encontrada ou coluna property_id ausente.');
  }

  // 6. Recriar indices que podem ter sido perdidos
  console.log('\n=== Recriando indices ===\n');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(property_id)',
  ];
  for (const sql of indexes) {
    await client.execute(sql);
  }
  console.log('Indices recriados.');

  console.log('\n=== Cleanup concluido com sucesso ===');
  process.exit(0);
}

cleanup().catch(e => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
