// server/db/recreate-schema.cjs
// Script de recriação completa do schema com Foreign Keys e constraints
// Executar: node server/db/recreate-schema.cjs

require('dotenv').config();
const { createClient } = require('@libsql/client');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing TURSO credentials in .env');
  process.exit(1);
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ═══════════════════════════════════════════════════════════════
// SCHEMA CORRETO COM FOREIGN KEYS
// ═══════════════════════════════════════════════════════════════

const NEW_SCHEMA = {
  properties: `
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT,
      type TEXT,
      price REAL,
      location TEXT,
      city TEXT,
      neighborhood TEXT,
      bedrooms INTEGER DEFAULT 0,
      bathrooms INTEGER DEFAULT 0,
      parkingSpaces INTEGER DEFAULT 0,
      area REAL,
      sizeUnit TEXT DEFAULT 'm²',
      status TEXT DEFAULT 'disponivel',
      images TEXT,
      suites INTEGER DEFAULT 0,
      livingRooms INTEGER DEFAULT 0,
      kitchens INTEGER DEFAULT 0,
      zipCode TEXT,
      state TEXT,
      streetNumber TEXT,
      complement TEXT,
      description TEXT,
      brokerName TEXT,
      broker_creci TEXT,
      thumbnail TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (broker_creci) REFERENCES brokers(creci)
    )
  `,

  brokers: `
    CREATE TABLE IF NOT EXISTS brokers (
      creci TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      photo TEXT,
      lastActive TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `,

  users: `
    CREATE TABLE IF NOT EXISTS users (
      login TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `,

  leads: `
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      interest TEXT,
      notes TEXT,
      score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'novo',
      date TEXT,
      potential_value INTEGER,
      property_id INTEGER,
      last_contacted TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (property_id) REFERENCES properties(id)
    )
  `,

  appointments: `
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_name TEXT,
      property_title TEXT,
      property_id TEXT,
      date_time TEXT,
      status TEXT DEFAULT 'agendado',
      notes TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (property_id) REFERENCES properties(id),
      FOREIGN KEY (lead_name) REFERENCES leads(name)
    )
  `,

  campaigns: `
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      property_title TEXT,
      instagram_status TEXT,
      instagram_post_id TEXT,
      instagram_url TEXT,
      campaign_status TEXT,
      campaign_id TEXT,
      has_carousel INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (property_id) REFERENCES properties(id)
    )
  `,

  telegram_users: `
    CREATE TABLE IF NOT EXISTS telegram_users (
      chat_id INTEGER PRIMARY KEY,
      username TEXT,
      creci TEXT,
      lang TEXT DEFAULT 'pt',
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (creci) REFERENCES brokers(creci)
    )
  `
};

// ═══════════════════════════════════════════════════════════════
// INDEXES PARA PERFORMANCE
// ═══════════════════════════════════════════════════════════════

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_properties_broker ON properties(broker_creci)',
  'CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status)',
  'CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city)',
  'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
  'CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(property_id)',
  'CREATE INDEX IF NOT EXISTS idx_campaigns_property ON campaigns(property_id)',
  'CREATE INDEX IF NOT EXISTS idx_appointments_property ON appointments(property_id)',
  'CREATE INDEX IF NOT EXISTS idx_telegram_users_creci ON telegram_users(creci)'
];

// ═══════════════════════════════════════════════════════════════
// MAPEAMENTO DE COLUNAS POR TABELA
// ═══════════════════════════════════════════════════════════════

const COLUMN_MAP = {
  properties: {
    // Colunas antigas → novas
    brokerCreci: 'broker_creci',  // Mapear coluna duplicada
    // Manter todas as colunas exceto brokerCreci
    keep: ['id', 'title', 'type', 'price', 'location', 'city', 'neighborhood', 
           'bedrooms', 'bathrooms', 'parkingSpaces', 'area', 'sizeUnit', 'status',
           'images', 'suites', 'livingRooms', 'kitchens', 'zipCode', 'state',
           'streetNumber', 'complement', 'description', 'brokerName', 'broker_creci',
           'thumbnail', 'created_at']
  },
  brokers: {
    keep: ['creci', 'name', 'email', 'phone', 'photo', 'lastActive', 'created_at']
  },
  users: {
    keep: ['login', 'password', 'name', 'email', 'phone', 'created_at']
  },
  leads: {
    keep: ['id', 'name', 'phone', 'interest', 'notes', 'score', 'status', 
           'date', 'potential_value', 'property_id', 'last_contacted', 'created_at']
  },
  appointments: {
    keep: ['id', 'lead_name', 'property_title', 'property_id', 'date_time', 
           'status', 'notes', 'created_at']
  },
  campaigns: {
    keep: ['id', 'property_id', 'property_title', 'instagram_status', 'instagram_post_id',
           'instagram_url', 'campaign_status', 'campaign_id', 'has_carousel', 'created_at']
  },
  telegram_users: {
    keep: ['chat_id', 'username', 'creci', 'lang', 'created_at']
  }
};

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE MIGRAÇÃO
// ═══════════════════════════════════════════════════════════════

async function backupTable(tableName) {
  console.log(`  📦 Backup: ${tableName}`);
  try {
    const data = await client.execute(`SELECT * FROM ${tableName}`);
    return data.rows;
  } catch (e) {
    console.error(`    ⚠️ Erro no backup: ${e.message}`);
    return [];
  }
}

async function dropTable(tableName) {
  console.log(`  🗑️ Drop: ${tableName}`);
  try {
    await client.execute(`DROP TABLE IF EXISTS ${tableName}`);
  } catch (e) {
    console.error(`    ⚠️ Erro no drop: ${e.message}`);
  }
}

async function createTable(tableName, schema) {
  console.log(`  ✨ Create: ${tableName}`);
  try {
    await client.execute({ sql: schema.trim(), args: [] });
  } catch (e) {
    console.error(`    ❌ Erro na criação: ${e.message}`);
    throw e;
  }
}

async function insertData(tableName, data, columnMap) {
  if (data.length === 0) {
    console.log(`  ℹ️ Sem dados para inserir: ${tableName}`);
    return;
  }
  
  console.log(`  📥 Insert: ${tableName} (${data.length} registros)`);
  
  const columns = columnMap.keep;
  
  for (const row of data) {
    // Mapear colunas antigas para novas
    const mappedRow = {};
    for (const col of columns) {
      if (row[col] !== undefined) {
        mappedRow[col] = row[col];
      } else if (col === 'broker_creci' && row.brokerCreci) {
        // Mapear brokerCreci → broker_creci
        mappedRow[col] = row.brokerCreci;
      } else {
        mappedRow[col] = null;
      }
    }
    
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => mappedRow[col]);
    
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        args: values
      });
    } catch (e) {
      console.error(`    ⚠️ Erro insert ${tableName}: ${e.message}`);
    }
  }
}

async function createIndexes() {
  console.log('\n📊 Criando indexes...');
  for (const sql of INDEXES) {
    try {
      await client.execute({ sql, args: [] });
    } catch (e) {
      if (!e.message?.includes('already exists')) {
        console.error(`    ⚠️ Index error: ${e.message}`);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SCRIPT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

async function recreate() {
  console.log('🔄 Iniciando recriação do schema...\n');
  
  // 1. Desabilitar foreign keys durante migração
  console.log('═══ FASE 0: Disable FKs ═══');
  await client.execute('PRAGMA foreign_keys = OFF');
  
  // 2. Backup de todas as tabelas
  console.log('\n═══ FASE 1: Backup ═══');
  const backups = {};
  const tableOrder = ['telegram_users', 'campaigns', 'appointments', 'leads', 'properties', 'brokers', 'users'];
  
  for (const table of tableOrder) {
    backups[table] = await backupTable(table);
  }
  
  // 3. Drop tabelas na ordem inversa (respeitar FKs)
  console.log('\n═══ FASE 2: Drop tables ═══');
  for (const table of [...tableOrder].reverse()) {
    await dropTable(table);
  }
  
  // 4. Criar tabelas com schema correto
  console.log('\n═══ FASE 3: Create tables ═══');
  for (const table of tableOrder) {
    await createTable(table, NEW_SCHEMA[table]);
  }
  
  // 5. Inserir dados com mapeamento (ordem: brokers → properties → campaigns → etc)
  console.log('\n═══ FASE 4: Migrate data ═══');
  const insertOrder = ['brokers', 'users', 'properties', 'leads', 'appointments', 'campaigns', 'telegram_users'];
  for (const table of insertOrder) {
    await insertData(table, backups[table], COLUMN_MAP[table]);
  }
  
  // 6. Reabilitar foreign keys
  console.log('\n═══ FASE 5: Enable FKs ═══');
  await client.execute('PRAGMA foreign_keys = ON');
  
  // 7. Criar indexes
  await createIndexes();
  
  // 8. Verificar resultado
  console.log('\n═══ FASE 6: Verify ═══');
  for (const table of tableOrder) {
    const count = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
    console.log(`  ✅ ${table}: ${count.rows[0].count} registros`);
  }
  
  // Verificar foreign keys
  const fk = await client.execute('PRAGMA foreign_key_list');
  console.log(`\n🔗 Foreign Keys: ${fk.rows.length} configuradas`);
  fk.rows.forEach(r => {
    console.log(`    ${r.table}.${r.from} → ${r.ref_table}`);
  });
  
  // Verificar indexes
  const indexes = await client.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
  console.log(`\n📊 Indexes: ${indexes.rows.length} criados`);
  indexes.rows.forEach(r => {
    console.log(`    ${r.name}`);
  });
  
  console.log('\n✅ Schema recriado com sucesso!');
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
// EXECUTAR
// ═══════════════════════════════════════════════════════════════

recreate().catch(e => {
  console.error('\n❌ Erro fatal:', e.message);
  process.exit(1);
});
