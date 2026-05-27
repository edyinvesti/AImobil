import { createClient } from '@libsql/client';

let client = null;

function getDb() {
  if (client) return client;
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.LIBSQL_AUTH_TOKEN?.trim();
  if (!url) throw new Error('DATABASE_URL não configurada');
  if (!authToken) throw new Error('LIBSQL_AUTH_TOKEN não configurado');
  client = createClient({ url, authToken });
  return client;
}

export async function getProperties() {
   const db = getDb();
   const rs = await db.execute("SELECT id, title, type, price, location, city, neighborhood, bedrooms, bathrooms, parkingSpaces, area, sizeUnit, status, created_at, broker_login, brokerlogin, images FROM properties ORDER BY created_at DESC LIMIT 20");
   return rs.rows.map(row => {
     let images = [];
     let thumbnail = null;
     
     // Parse images if they exist
     if (row.images && row.images !== '[]') {
       try {
         // Handle the case where images might be stored with leading '['
         const imagesStr = row.images.startsWith('[') ? row.images : '[' + row.images;
         images = JSON.parse(imagesStr);
         // Set thumbnail to first image if available
         if (images.length > 0) {
           thumbnail = images[0];
         }
       } catch (e) {
         console.error('Error parsing images:', e);
         images = [];
         thumbnail = null;
       }
     }
     
     return {
       ...row,
       images: images,
       thumbnail: thumbnail,
       offerType: null,
       parkingSpaces: row.parkingSpaces || 0,
       sizeUnit: row.sizeUnit || 'm²',
       size: row.area || 0,
       address: row.location || '',
     };
   });
 }

export async function getPropertyImages(id) {
  const db = getDb();
  try {
    const rs = await db.execute({
      sql: "SELECT images FROM properties WHERE id = ?",
      args: [id]
    });
    if (rs.rows.length === 0) return [];
    
    const imagesField = rs.rows[0].images;
    if (!imagesField || imagesField === '[]') return [];
    
    try {
      // The images field should be a valid JSON array string
      const parsed = JSON.parse(imagesField);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing images JSON:', e.message, 'imagesField:', imagesField);
      // Try to fix common JSON issues
      try {
        // Handle case where it might be missing outer brackets
        if (imagesField.startsWith('"') && imagesField.endsWith('"')) {
          const fixed = '[' + imagesField + ']';
          const parsed = JSON.parse(fixed);
          return Array.isArray(parsed) ? parsed : [];
        }
        // Handle case where it might have extra characters
        const trimmed = imagesField.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch (fixError) {
        console.error('Error fixing images JSON:', fixError.message);
      }
      return [];
    }
  } catch (e) {
    console.error('getPropertyImages error:', e.message);
    return [];
  }
}

export async function addProperty(property) {
  const db = getDb();
  const id = property.id || `prop_${Date.now()}`;
  await db.execute({
    sql: `INSERT OR REPLACE INTO properties (id, title, type, price, location, city, neighborhood, bedrooms, bathrooms, parkingSpaces, area, sizeUnit, status, images, created_at, broker_login)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, property.title, property.type,
      property.price, property.address || property.location || '', property.city || '',
      property.neighborhood || '', property.bedrooms || 0,
      property.bathrooms || 0,
      property.parkingSpaces || property.parking_spaces || 0,
      property.size || property.area || 0, 
      property.sizeUnit || property.size_unit || 'm²',
      property.status || 'aprovado',
      JSON.stringify(property.images || []),
      Date.now(),
      property.brokerlogin || property.broker_login || ''
    ]
  });
  return id;
}

export async function deleteProperty(id) {
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM properties WHERE id = ?', args: [id] });
}

export async function getLeads() {
  const db = getDb();
  const rs = await db.execute('SELECT * FROM leads ORDER BY created_at DESC');
  return rs.rows;
}

export async function addLead(lead) {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO leads (name, phone, interest, notes, score, status, date, potential_value, property_id, last_contacted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [lead.name, lead.phone || '', lead.interest || '', lead.notes || '',
           lead.score || 0, lead.status || 'novo', lead.date || '',
           lead.potential_value || 0, lead.property_id || null, lead.last_contacted || '']
  });
  return lead;
}

export async function getAppointments() {
  const db = getDb();
  const rs = await db.execute('SELECT * FROM appointments ORDER BY date_time ASC');
  return rs.rows;
}

export async function addAppointment(appointment) {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO appointments (lead_name, property_title, date_time, status, notes) VALUES (?, ?, ?, ?, ?)`,
    args: [
      appointment.leadName || appointment.lead_name || '',
      appointment.propertyTitle || appointment.property_title || '',
      appointment.dateTime || appointment.date_time || appointment.date || '',
      appointment.status || 'agendado',
      appointment.notes || appointment.note || ''
    ]
  });
  return appointment;
}

const usersCache = new Map();

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(36);
}

export async function getBroker(login) {
  const db = getDb();
  const rs = await db.execute({ sql: 'SELECT * FROM brokers WHERE login = ?', args: [login] });
  return rs.rows[0] || null;
}

export async function upsertBroker(broker) {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO brokers (login, name, email, phone, photo, lastActive)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(login) DO UPDATE SET
            name=COALESCE(NULLIF(?,''), name),
            email=COALESCE(NULLIF(?,''), email),
            phone=COALESCE(NULLIF(?,''), phone),
            photo=COALESCE(NULLIF(?,''), photo),
            lastActive=excluded.lastActive`,
    args: [
      broker.login, broker.name || '', broker.email || '', broker.phone || '', broker.photo || '', new Date().toISOString(),
      broker.name || '', broker.email || '', broker.phone || '', broker.photo || ''
    ]
  });
  return broker;
}

export async function createUser(login, password, name, email, phone) {
  if (usersCache.has(login)) {
    throw new Error('login já cadastrado');
  }
  const hash = simpleHash(password);
  usersCache.set(login, { login, password: hash, name, email, phone, createdAt: Date.now() });
  return { login, name, email, phone };
}

export async function validateUser(login, password) {
  const user = usersCache.get(login);
  if (!user) return null;
  const hash = simpleHash(password);
  return user.password === hash ? { login: user.login, name: user.name, email: user.email, phone: user.phone } : null;
}
