const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = process.env.DATABASE_URL || 'file:' + path.join(__dirname, '../data/iamobil.db');
const localDbPath = 'file:' + path.join(__dirname, '../data/iamobil.db');

let client;

async function initializeClientWithFallback() {
  // Try remote database first if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    try {
      console.log('Attempting to connect to remote Turso database...');
      client = createClient({ 
        url: dbPath,
        authToken: process.env.LIBSQL_AUTH_TOKEN || ''
      });
      await initializeTables();
      console.log('Turso client created successfully');
      return true;
    } catch (e) {
      console.log('Remote Turso connection failed:', e.message);
      console.log('Falling back to local SQLite database...');
      // Fall through to try local database
    }
  }
  
  // Try local database
  try {
    console.log('Attempting to connect to local SQLite database...');
    client = createClient({ 
      url: localDbPath
    });
    await initializeTables();
    console.log('Local SQLite client created successfully');
    return true;
  } catch (e) {
    console.log('Local database also failed:', e.message);
    console.log('Error details:', {
      message: e.message,
      code: e.code,
      stack: e.stack
    });
    client = null;
    return false;
  }
}

initializeClientWithFallback().then(success => {
  if (!success) {
    console.log('Warning: Running in memory-only mode');
  }
});

async function initializeTables() {
  if (!client) return;
  
  try {
    await client.execute({ sql: `ALTER TABLE properties ADD COLUMN created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)`, args: [] }).catch(() => {});
    await client.execute({ sql: `ALTER TABLE leads ADD COLUMN created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)`, args: [] }).catch(() => {});
    await client.execute({ sql: `ALTER TABLE appointments ADD COLUMN created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)`, args: [] }).catch(() => {});
    
    await client.batch([
      `CREATE TABLE IF NOT EXISTS leads (
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
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )`,
      `CREATE TABLE IF NOT EXISTS properties (
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
        brokerCreci TEXT,
        broker_creci TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )`,
      `CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_name TEXT,
        property_title TEXT,
        date_time TEXT,
        status TEXT DEFAULT 'agendado',
        notes TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )`,
      `CREATE TABLE IF NOT EXISTS telegram_users (
        chat_id INTEGER PRIMARY KEY,
        username TEXT,
        creci TEXT,
        lang TEXT DEFAULT 'pt',
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )`,
      `CREATE TABLE IF NOT EXISTS brokers (
        creci TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        photo TEXT,
        lastActive TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )`
    ], "write");
  } catch (e) {
    console.error('Erro ao inicializar tabelas:', e.message);
  }
}

class DataEngine {
  async addLead(lead) {
    if (!client) return null;
    try {
      return await client.execute({
        sql: `INSERT INTO leads (name, phone, interest, notes, score, status, date, potential_value, property_id, last_contacted) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [lead.name, lead.phone, lead.interest || '', lead.notes || '', 
               lead.score || 0, lead.status || 'novo', lead.date || '', 
               lead.potential_value || 0, lead.property_id || null, lead.last_contacted || '']
      });
    } catch (e) {
      console.error('addLead error:', e.message);
      return null;
    }
  }

  async getLeads() {
    if (!client) return [];
    try {
      const rs = await client.execute('SELECT * FROM leads ORDER BY created_at DESC');
      return rs.rows;
    } catch (e) {
      console.error('getLeads error:', e.message);
      return [];
    }
  }

  async deleteProperty(id) {
    if (!client) return null;
    try {
      return await client.execute({
        sql: 'DELETE FROM properties WHERE id = ?',
        args: [id]
      });
    } catch (e) {
      console.error('deleteProperty error:', e.message);
      return null;
    }
  }

  async addProperty(property) {
    if (!client) return null;
    try {
       return await client.execute({
         sql: `INSERT INTO properties (id, title, type, price, location, city, neighborhood, 
               bedrooms, bathrooms, parkingSpaces, area, sizeUnit, status, images, suites, 
               livingRooms, kitchens, zipCode, state, streetNumber, complement, description, 
               brokerName, brokerCreci, broker_creci) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         args: [
           property.id, property.title, property.type, property.price,
           property.address || property.location || '', property.city || '', property.neighborhood || '',
           property.bedrooms || 0, property.bathrooms || 0,
           property.parkingSpaces || property.parking_spaces || 0,
           property.size || property.area || 0,
           property.sizeUnit || property.size_unit || 'm²',
           property.status || 'disponivel', JSON.stringify(property.images || []),
           property.suites || 0, property.livingRooms || 0, property.kitchens || 0,
           property.zipCode || '', property.state || '', property.streetNumber || '',
           property.complement || '', property.description || '',
           property.brokerName || '', property.brokerCreci || '', property.broker_creci || ''
         ]
       });
    } catch (e) {
      console.error('addProperty error:', e.message);
      return null;
    }
  }

  async getProperties() {
    if (!client) return [];
    try {
      // Exclude the images column from list queries to avoid SQLite out-of-memory errors.
      // Images are large base64 strings (~300-500KB each) that cause SQLITE_NOMEM when
      // loading all properties at once. Images are fetched per-property on demand via
      // the /api/partner/property-image endpoint.
      const rs = await client.execute(
        'SELECT id, title, type, price, location, city, neighborhood, bedrooms, bathrooms, ' +
        'parkingSpaces, area, sizeUnit, status, suites, livingRooms, kitchens, zipCode, state, ' +
        'streetNumber, complement, description, brokerName, brokerCreci, broker_creci, created_at ' +
        'FROM properties ORDER BY created_at DESC'
      );
      return rs.rows.map(row => ({
        ...row,
        images: [],       // Don't load images in list - fetch on demand
        thumbnail: null,  // Will be loaded when the property is opened
        address: row.location || '',
        size: row.area || 0,
        offerType: null,
        parkingSpaces: row.parkingSpaces || 0,
        sizeUnit: row.sizeUnit || 'm²',
        brokerCreci: row.brokerCreci || row.broker_creci || '',
      }));
    } catch (e) {
      console.error('getProperties error:', e.message);
      return [];
    }
  }

  async getPropertyById(id) {
    if (!client) return null;
    try {
      const rs = await client.execute({
        sql: 'SELECT * FROM properties WHERE id = ?',
        args: [id]
      });
      if (rs.rows.length === 0) return null;
      const row = rs.rows[0];
      return {
        ...row,
        images: row.images ? JSON.parse(row.images) : [],
        address: row.location || '',
        size: row.area || 0,
        parkingSpaces: row.parkingSpaces || 0,
        brokerCreci: row.brokerCreci || row.broker_creci || '',
      };
    } catch (e) {
      console.error('getPropertyById error:', e.message);
      return null;
    }
  }

  async addAppointment(appointment) {
    if (!client) return null;
    try {
      return await client.execute({
        sql: `INSERT INTO appointments (lead_name, property_title, date_time, status, notes) 
              VALUES (?, ?, ?, ?, ?)`,
        args: [appointment.leadName || appointment.lead_name || '', 
               appointment.propertyTitle || appointment.property_title || '',
               appointment.dateTime || appointment.date_time || appointment.date || '',
               appointment.status || 'agendado', appointment.notes || appointment.note || '']
      });
    } catch (e) {
      console.error('addAppointment error:', e.message);
      return null;
    }
  }

  async getAppointments() {
    if (!client) return [];
    try {
      const rs = await client.execute('SELECT * FROM appointments ORDER BY date_time ASC');
      return rs.rows;
    } catch (e) {
      console.error('getAppointments error:', e.message);
      return [];
    }
  }

  async saveTelegramUser(chatId, username, creci = null) {
    if (!client) return null;
    try {
      return await client.execute({
        sql: `INSERT OR REPLACE INTO telegram_users (chat_id, username, creci) VALUES (?, ?, ?)`,
        args: [chatId, username, creci]
      });
    } catch (e) {
      console.error('saveTelegramUser error:', e.message);
      return null;
    }
  }

  async getTelegramUser(chatId) {
    if (!client) return null;
    try {
      const rs = await client.execute({
        sql: 'SELECT * FROM telegram_users WHERE chat_id = ?',
        args: [chatId]
      });
      return rs.rows[0] || null;
    } catch (e) {
      console.error('getTelegramUser error:', e.message);
      return null;
    }
  }

  async linkUserToTelegram(creci, chatId) {
    if (!client) return null;
    try {
      await client.execute({
        sql: 'UPDATE telegram_users SET creci = ? WHERE chat_id = ?',
        args: [creci, chatId]
      });
      return { success: true };
    } catch (e) {
      console.error('linkUserToTelegram error:', e.message);
      return null;
    }
  }

  async getBroker(creci) {
    if (!client) return null;
    try {
      const rs = await client.execute({
        sql: 'SELECT * FROM brokers WHERE creci = ?',
        args: [creci]
      });
      return rs.rows[0] || null;
    } catch (e) {
      console.error('getBroker error:', e.message);
      throw e; // Throw to be caught by route handler
    }
  }

  async saveBroker(broker) {
    if (!client) return null;
    try {
      await client.execute({
        sql: `INSERT INTO brokers (creci, name, email, phone, photo, lastActive)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(creci) DO UPDATE SET
                name=COALESCE(NULLIF(?,''), name),
                email=COALESCE(NULLIF(?,''), email),
                phone=COALESCE(NULLIF(?,''), phone),
                photo=COALESCE(NULLIF(?,''), photo),
                lastActive=excluded.lastActive`,
        args: [
          broker.creci, broker.name || '', broker.email || '', broker.phone || '',
          broker.photo || '', new Date().toISOString(),
          broker.name || '', broker.email || '', broker.phone || '', broker.photo || ''
        ]
      });
      return { success: true };
    } catch (e) {
      console.error('saveBroker error:', e.message);
      throw e; // Throw to be caught by route handler
    }
  }

  async getAllBrokers() {
    if (!client) return [];
    try {
      const rs = await client.execute('SELECT * FROM brokers ORDER BY created_at DESC');
      return rs.rows;
    } catch (e) {
      console.error('getAllBrokers error:', e.message);
      return [];
    }
  }
}

module.exports = { DataEngine };
