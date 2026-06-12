// server/db/index.cjs
// DataEngine Singleton - único por processo
const { createClient } = require('@libsql/client');
const { TABLES, INDEXES } = require('./schema.cjs');
const { runMigrations } = require('./migrations.cjs');

class DataEngine {
  constructor() {
    this.client = null;
  }

  async initialize() {
    const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

    if (!tursoUrl || !tursoToken) {
      console.error('Missing TURSO credentials in environment variables.');
      return false;
    }

    try {
      console.log('Connecting to TURSO database...');
      this.client = createClient({ url: tursoUrl, authToken: tursoToken });
      
      // Criar tabelas
      const statements = Object.values(TABLES).map(sql => sql.trim());
      await this.client.batch(statements, 'write');
      
      // Rodar migrations
      await runMigrations(this.client);
      
      // Criar indexes para performance
      for (const sql of INDEXES) {
        try {
          await this.client.execute({ sql, args: [] });
        } catch (e) {
          // Ignorar erro se index já existe
          if (!e.message?.includes('already exists')) {
            console.error('Index creation error:', e.message);
          }
        }
      }
      
      console.log('TURSO client created successfully');
      return true;
    } catch (e) {
      console.error('TURSO connection failed:', e.message);
      this.client = null;
      return false;
    }
  }

  getClient() {
    return this.client;
  }

  // ═══════════════════════════════════════════════════════════════
  // PROPERTIES
  // ═══════════════════════════════════════════════════════════════

  async getProperties() {
    if (!this.client) return [];
    try {
      const rs = await this.client.execute(
        'SELECT id, title, type, price, location, city, neighborhood, bedrooms, bathrooms, ' +
        'parkingSpaces, area, sizeUnit, status, suites, livingRooms, kitchens, zipCode, state, ' +
        'streetNumber, complement, description, brokerName, broker_login, created_at, ' +
        'thumbnail, video_type, video_url, ' +
        'CASE WHEN video_data IS NOT NULL AND video_data != \'\' THEN 1 ELSE 0 END as has_video, ' +
        "CASE WHEN thumbnail IS NULL OR thumbnail = '' THEN json_extract(images, '$[0]') ELSE NULL END as img_fallback " +
        'FROM properties ORDER BY created_at DESC'
      );
      return rs.rows.map(row => ({
        ...row,
        images: [],
        videoData: null,
        videoUrl: row.video_url || null,
        hasVideo: row.has_video === 1,
        videoType: row.video_type || 'video/mp4',
        thumbnail: row.thumbnail || row.img_fallback || null,
        address: row.location || '',
        size: row.area || 0,
        offerType: null,
        parkingSpaces: row.parkingSpaces || 0,
      }));
    } catch (e) {
      console.error('getProperties error:', e.message);
      return [];
    }
  }

  async getPropertyById(id) {
    if (!this.client) return null;
    try {
      const rs = await this.client.execute({
        sql: 'SELECT * FROM properties WHERE id = ?',
        args: [id]
      });
      if (rs.rows.length === 0) return null;
      const row = rs.rows[0];
      let imagesRaw = [];
      try {
        const raw = row.images ? (Buffer.isBuffer(row.images) ? row.images.toString() : row.images) : '';
        imagesRaw = raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('getPropertyById JSON parse error:', e.message);
        imagesRaw = [];
      }
      return {
        ...row,
        images: Array.isArray(imagesRaw) ? imagesRaw.map(i => Buffer.isBuffer(i) ? i.toString() : i) : [],
        videoData: row.video_data || null,
        videoType: row.video_type || 'video/mp4',
        videoUrl: row.video_url || null,
        address: row.location || '',
        size: row.area || 0,
        parkingSpaces: row.parkingSpaces || 0,
        brokerLogin: row.broker_login || '',
      };
    } catch (e) {
      console.error('getPropertyById error:', e.message);
      return null;
    }
  }

  async addProperty(property) {
    if (!this.client) return null;
    try {
      return await this.client.execute({
        sql: `INSERT OR REPLACE INTO properties (id, title, type, price, location, city, neighborhood, 
              bedrooms, bathrooms, parkingSpaces, area, sizeUnit, status, images, suites, 
              livingRooms, kitchens, zipCode, state, streetNumber, complement, description, 
              brokerName, broker_login, thumbnail, video_data, video_type, video_url) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          property.brokerName || '', property.brokerLogin || property.broker_login || '',
          property.thumbnail || '',
          property.videoData || property.video_data || null,
          property.videoType || property.video_type || 'video/mp4',
          property.videoUrl || property.video_url || ''
        ]
      });
    } catch (e) {
      console.error('addProperty error:', e.message);
      return null;
    }
  }

  async updatePropertyVideo(id, videoUrl) {
    if (!this.client) return null;
    try {
      return await this.client.execute({
        sql: 'UPDATE properties SET video_url = ? WHERE id = ?',
        args: [videoUrl || '', id]
      });
    } catch (e) {
      console.error('updatePropertyVideo error:', e.message);
      return null;
    }
  }

  async deleteProperty(id) {
    if (!this.client) return null;
    try {
      return await this.client.execute({
        sql: 'DELETE FROM properties WHERE id = ?',
        args: [id]
      });
    } catch (e) {
      console.error('deleteProperty error:', e.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LEADS
  // ═══════════════════════════════════════════════════════════════

  async getLeads() {
    if (!this.client) return [];
    try {
      const rs = await this.client.execute('SELECT * FROM leads ORDER BY created_at DESC');
      return rs.rows;
    } catch (e) {
      console.error('getLeads error:', e.message);
      return [];
    }
  }

  async addLead(lead) {
    if (!this.client) return null;
    try {
      return await this.client.execute({
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

  async updateLead(id, data) {
    if (!this.client) return null;
    try {
      const sets = [];
      const args = [];
      const fields = ['name', 'phone', 'interest', 'notes', 'score', 'status', 'potential_value', 'property_id', 'last_contacted'];
      for (const f of fields) {
        if (data[f] !== undefined) {
          sets.push(`${f} = ?`);
          args.push(data[f]);
        }
      }
      if (sets.length === 0) return { success: true };
      args.push(id);
      await this.client.execute({
        sql: `UPDATE leads SET ${sets.join(', ')} WHERE rowid = ?`,
        args
      });
      return { success: true };
    } catch (e) {
      console.error('updateLead error:', e.message);
      return null;
    }
  }

  async deleteLead(id) {
    if (!this.client) return false;
    try {
      await this.client.execute('DELETE FROM leads WHERE rowid = ?', [id]);
      return true;
    } catch (e) {
      console.error('deleteLead error:', e.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // APPOINTMENTS
  // ═══════════════════════════════════════════════════════════════

  async getAppointments() {
    if (!this.client) return [];
    try {
      const rs = await this.client.execute('SELECT * FROM appointments ORDER BY date_time ASC');
      return rs.rows;
    } catch (e) {
      console.error('getAppointments error:', e.message);
      return [];
    }
  }

  async addAppointment(appointment) {
    if (!this.client) return null;
    try {
      return await this.client.execute({
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

  async updateAppointment(id, data) {
    if (!this.client) return null;
    try {
      const sets = [];
      const args = [];
      const fields = ['lead_name', 'property_title', 'date_time', 'status', 'notes'];
      const map = { leadName: 'lead_name', propertyTitle: 'property_title', dateTime: 'date_time', date: 'date_time', note: 'notes' };
      for (const f of fields) {
        const val = data[f] ?? data[Object.keys(map).find(k => map[k] === f)] ?? undefined;
        if (val !== undefined) {
          sets.push(`${f} = ?`);
          args.push(val);
        }
      }
      if (sets.length === 0) return { success: true };
      args.push(id);
      await this.client.execute({
        sql: `UPDATE appointments SET ${sets.join(', ')} WHERE rowid = ?`,
        args
      });
      return { success: true };
    } catch (e) {
      console.error('updateAppointment error:', e.message);
      return null;
    }
  }

  async deleteAppointment(id) {
    if (!this.client) return false;
    try {
      await this.client.execute('DELETE FROM appointments WHERE rowid = ?', [id]);
      return true;
    } catch (e) {
      console.error('deleteAppointment error:', e.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BROKERS (unificado — antiga tabela users)
  // ═══════════════════════════════════════════════════════════════

  async createBroker(user) {
    if (!this.client) return null;
    try {
      return await this.client.execute({
        sql: `INSERT INTO brokers (creci, login, password, name, email, phone, photo, lastActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [user.login, user.login, user.password, user.name, user.email, user.phone || '', user.photo || '', user.lastActive || '']
      });
    } catch (e) {
      console.error('createBroker error:', e.message);
      return null;
    }
  }

  async validateBroker(login) {
    if (!this.client) return null;
    try {
      const rs = await this.client.execute({
        sql: 'SELECT * FROM brokers WHERE login = ? OR creci = ?',
        args: [login, login]
      });
      return rs.rows[0] || null;
    } catch (e) {
      console.error('validateBroker error:', e.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BROKERS
  // ═══════════════════════════════════════════════════════════════

  async getBroker(creci) {
    if (!this.client) return null;
    try {
      const rs = await this.client.execute({
        sql: 'SELECT * FROM brokers WHERE creci = ?',
        args: [creci]
      });
      return rs.rows[0] || null;
    } catch (e) {
      console.error('getBroker error:', e.message);
      return null;
    }
  }

  async getBrokerByName(name) {
    if (!this.client) return null;
    try {
      const rs = await this.client.execute({
        sql: 'SELECT * FROM brokers WHERE name = ?',
        args: [name]
      });
      return rs.rows[0] || null;
    } catch (e) {
      console.error('getBrokerByName error:', e.message);
      return null;
    }
  }

  async saveBroker(broker) {
    if (!this.client) return null;
    try {
      let password = broker.password;
      if (!password) {
        const existing = await this.client.execute({
          sql: 'SELECT password FROM brokers WHERE creci = ? OR login = ?',
          args: [broker.creci || broker.login, broker.login || broker.creci]
        });
        password = existing.rows[0]?.password || '';
      }
      await this.client.execute({
        sql: `INSERT OR REPLACE INTO brokers (creci, name, email, phone, photo, login, lastActive, password)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          broker.creci || broker.login, broker.name || '', broker.email || '',
          broker.phone || '', broker.photo || '', broker.login || '',
          broker.lastActive || '', password
        ]
      });
      return { success: true };
    } catch (e) {
      console.error('saveBroker error:', e.message);
      return null;
    }
  }

  async getAllBrokers() {
    if (!this.client) return [];
    try {
      const rs = await this.client.execute('SELECT * FROM brokers ORDER BY name');
      return rs.rows;
    } catch (e) {
      console.error('getAllBrokers error:', e.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════

  async getCampaigns() {
    if (!this.client) return [];
    try {
      const rs = await this.client.execute('SELECT * FROM campaigns ORDER BY created_at DESC');
      return rs.rows.map(r => ({
        ...r,
        has_carousel: !!r.has_carousel
      }));
    } catch (e) {
      console.error('getCampaigns error:', e.message);
      return [];
    }
  }

  async saveCampaign(campaign) {
    if (!this.client) return null;
    try {
      await this.client.execute({
        sql: `INSERT OR REPLACE INTO campaigns (id, property_id, property_title, instagram_status, instagram_post_id, instagram_url, campaign_status, campaign_id, has_carousel, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          campaign.id, campaign.property_id, campaign.property_title || '',
          campaign.instagram_status || '', campaign.instagram_post_id || '',
          campaign.instagram_url || '', campaign.campaign_status || '',
          campaign.campaign_id || '', campaign.has_carousel ? 1 : 0,
          campaign.created_at || Date.now()
        ]
      });
      return { success: true };
    } catch (e) {
      console.error('saveCampaign error:', e.message);
      return null;
    }
  }

  async deleteCampaign(id) {
    if (!this.client) return false;
    try {
      await this.client.execute('DELETE FROM campaigns WHERE id = ?', [id]);
      return true;
    } catch (e) {
      console.error('deleteCampaign error:', e.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TELEGRAM
  // ═══════════════════════════════════════════════════════════════

  async saveTelegramUser(chatId, username, login = null) {
    if (!this.client) return null;
    try {
      return await this.client.execute({
        sql: `INSERT OR REPLACE INTO telegram_users (chat_id, username, login) VALUES (?, ?, ?)`,
        args: [chatId, username, login]
      });
    } catch (e) {
      console.error('saveTelegramUser error:', e.message);
      return null;
    }
  }

  async getTelegramUser(chatId) {
    if (!this.client) return null;
    try {
      const rs = await this.client.execute({
        sql: 'SELECT * FROM telegram_users WHERE chat_id = ?',
        args: [chatId]
      });
      return rs.rows[0] || null;
    } catch (e) {
      console.error('getTelegramUser error:', e.message);
      return null;
    }
  }

  async linkUserToTelegram(login, chatId) {
    if (!this.client) return null;
    try {
      await this.client.execute({
        sql: 'UPDATE telegram_users SET login = ? WHERE chat_id = ?',
        args: [login, chatId]
      });
      return { success: true };
    } catch (e) {
      console.error('linkUserToTelegram error:', e.message);
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════

let instance = null;

async function getDataEngine() {
  if (!instance) {
    instance = new DataEngine();
    await instance.initialize();
  }
  return instance;
}

module.exports = { DataEngine, getDataEngine };
