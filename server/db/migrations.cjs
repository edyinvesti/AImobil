// server/db/migrations.cjs
// Migrations controladas para ALTER TABLEs

const MIGRATIONS = [
  // Adicionar created_at em tabelas que não têm (sem DEFAULT para evitar erro)
  `ALTER TABLE brokers ADD COLUMN created_at INTEGER`,
  
  // Adicionar thumbnail em properties
  `ALTER TABLE properties ADD COLUMN thumbnail TEXT`,
  
  // Adicionar property_id em appointments (FK)
  `ALTER TABLE appointments ADD COLUMN property_id TEXT`,
  
  // Fix created_at DEFAULT 0 → timestamp real
  `UPDATE properties SET created_at = (strftime('%s', 'now') * 1000) WHERE created_at = 0`,
  
  // Preencher created_at nulo com timestamp atual
  `UPDATE brokers SET created_at = (strftime('%s', 'now') * 1000) WHERE created_at IS NULL`,
  
  // Remover coluna duplicada brokerCreci (manter apenas broker_creci)
  // SQLite não suporta DROP COLUMN diretamente, será feito via recriação
];

async function runMigrations(client) {
  for (const sql of MIGRATIONS) {
    try {
      await client.execute({ sql, args: [] });
    } catch (e) {
      // Ignorar erro se coluna já existe (SQLITE_ERROR: duplicate column name)
      if (!e.message?.includes('duplicate column')) {
        console.error('Migration error:', e.message);
      }
    }
  }
}

module.exports = { runMigrations };
