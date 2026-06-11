const MIGRATIONS = [
  // ═══════════════════════════════════════════════════════════════
  // V1 — Migrações estruturais (idempotentes)
  // ═══════════════════════════════════════════════════════════════

  `ALTER TABLE properties ADD COLUMN broker_login TEXT`,
  `UPDATE properties SET broker_login = broker_creci WHERE broker_login IS NULL AND broker_creci IS NOT NULL`,
  `ALTER TABLE telegram_users ADD COLUMN login TEXT`,
  `UPDATE telegram_users SET login = creci WHERE login IS NULL AND creci IS NOT NULL`,

  // ═══════════════════════════════════════════════════════════════
  // V2 — Novas colunas em properties
  // ═══════════════════════════════════════════════════════════════

  `ALTER TABLE properties ADD COLUMN video_data TEXT`,
  `ALTER TABLE properties ADD COLUMN video_type TEXT DEFAULT 'video/mp4'`,
  `ALTER TABLE properties ADD COLUMN offer_type TEXT`,
  `ALTER TABLE properties ADD COLUMN amenities TEXT`,
  `ALTER TABLE properties ADD COLUMN latitude REAL`,
  `ALTER TABLE properties ADD COLUMN longitude REAL`,
  `ALTER TABLE properties ADD COLUMN marketing_option TEXT DEFAULT 'none'`,
  `UPDATE properties SET broker_creci = broker_login WHERE broker_creci IS NULL AND broker_login IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_properties_broker_creci ON properties(broker_creci)`,

  // ═══════════════════════════════════════════════════════════════
  // V4 — Cleanup: tabela users removida (dados migrados para brokers)
  // ═══════════════════════════════════════════════════════════════

  `DROP TABLE IF EXISTS users`,

  // ═══════════════════════════════════════════════════════════════
  // V5 — Corrigir case-sensitive dos status das campanhas
  // ═══════════════════════════════════════════════════════════════

  `UPDATE campaigns SET instagram_status = 'PUBLISHED' WHERE instagram_status = 'published'`,
  `UPDATE campaigns SET instagram_status = 'DRAFT' WHERE instagram_status = 'draft'`,
  `UPDATE campaigns SET campaign_status = 'ACTIVE' WHERE campaign_status = 'active'`,
  `UPDATE campaigns SET campaign_status = 'PENDING' WHERE campaign_status = 'pending'`,
  `UPDATE campaigns SET campaign_status = 'ERROR' WHERE campaign_status = 'error'`,
];

async function runMigrations(client) {
  for (const sql of MIGRATIONS) {
    try {
      await client.execute({ sql, args: [] });
    } catch (e) {
      if (!e.message?.includes('duplicate column')) {
        console.error('Migration error:', e.message);
      }
    }
  }
}

module.exports = { runMigrations };
