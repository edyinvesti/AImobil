// server/db/migrations.cjs
// Migrations controladas para ALTER TABLEs

const MIGRATIONS = [
  // Adicionar broker_login em properties
  `ALTER TABLE properties ADD COLUMN broker_login TEXT`,
  
  // Copiar dados de broker_creci → broker_login
  `UPDATE properties SET broker_login = broker_creci WHERE broker_login IS NULL AND broker_creci IS NOT NULL`,
  
  // Adicionar photo e lastActive em users
  `ALTER TABLE users ADD COLUMN photo TEXT`,
  `ALTER TABLE users ADD COLUMN lastActive TEXT`,
  
  // Copiar dados de brokers para users (foto, ultimo acesso)
  `UPDATE users SET photo = (SELECT photo FROM brokers WHERE brokers.name = users.name) WHERE EXISTS (SELECT 1 FROM brokers WHERE brokers.name = users.name)`,
  
  // Adicionar login em telegram_users
  `ALTER TABLE telegram_users ADD COLUMN login TEXT`,
  
  // Copiar dados de creci → login em telegram_users
  `UPDATE telegram_users SET login = creci WHERE login IS NULL AND creci IS NOT NULL`,
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
