// server/db/schema.cjs
// Definição de tabelas do IAmobil

const TABLES = {
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
      video_data TEXT,
      video_type TEXT DEFAULT 'video/mp4',
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
      FOREIGN KEY (property_id) REFERENCES properties(id)
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
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `
};

// Indexes para performance
const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_properties_broker ON properties(broker_creci)',
  'CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status)',
  'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
  'CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(property_id)',
  'CREATE INDEX IF NOT EXISTS idx_campaigns_property ON campaigns(property_id)',
  'CREATE INDEX IF NOT EXISTS idx_appointments_property ON appointments(property_id)'
];

module.exports = { TABLES, INDEXES };
