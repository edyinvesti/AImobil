// server/db/restore-data.cjs
// Script de restauração de dados do IAmobil
// Executar: node server/db/restore-data.cjs

require('dotenv').config();
const { createClient } = require('@libsql/client');
const crypto = require('crypto');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing TURSO credentials in .env');
  process.exit(1);
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ═══════════════════════════════════════════════════════════════
// DADOS ORIGINAIS (restaurados da auditoria)
// ═══════════════════════════════════════════════════════════════

const USERS = [
  {
    login: 'admin',
    password: 'admin123',
    name: 'Administrador',
    email: 'admin@iaimobil.com.br',
    phone: '(11) 99999-0001',
    photo: '',
    lastActive: new Date().toISOString()
  },
  {
    login: 'samuel',
    password: 'samuel123',
    name: 'Samuel',
    email: 'samuel@iaimobil.com.br',
    phone: '(11) 99999-1808',
    photo: '',
    lastActive: new Date().toISOString()
  },
  {
    login: 'kelly',
    password: 'kelly123',
    name: 'Kelly',
    email: 'kelly@iaimobil.com.br',
    phone: '(11) 99999-1234',
    photo: '',
    lastActive: new Date().toISOString()
  },
  {
    login: 'hanny',
    password: 'hanny123',
    name: 'Hanny',
    email: 'hanny@iaimobil.com.br',
    phone: '(11) 99999-2321',
    photo: '',
    lastActive: new Date().toISOString()
  },
  {
    login: 'kaua',
    password: 'kaua123',
    name: 'Kaua',
    email: 'kaua@iaimobil.com.br',
    phone: '(11) 99999-2320',
    photo: '',
    lastActive: new Date().toISOString()
  },
  {
    login: 'edyinvesti',
    password: '123456',
    name: 'Edyinvesti',
    email: 'edyinvesti@iaimobil.com.br',
    phone: '(62) 99211-5143',
    photo: '',
    lastActive: new Date().toISOString()
  }
];

const PROPERTIES = [
  {
    id: 'prop-001',
    title: 'Apartamento 3 Quartos - Jardim Europa',
    type: 'apartamento',
    price: 850000,
    location: 'Rua dos Jardins, 123',
    city: 'São Paulo',
    neighborhood: 'Jardim Europa',
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    area: 120,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 1,
    livingRooms: 1,
    kitchens: 1,
    zipCode: '01426-000',
    state: 'SP',
    streetNumber: '123',
    complement: 'Apto 101',
    description: 'Apartamento moderno com vista panorâmica',
    brokerName: 'Samuel',
    broker_login: 'samuel',
    thumbnail: '',
    created_at: Date.now()
  },
  {
    id: 'prop-002',
    title: 'Casa 4 Quartos - Moema',
    type: 'casa',
    price: 1200000,
    location: 'Rua dos Pinheiros, 456',
    city: 'São Paulo',
    neighborhood: 'Moema',
    bedrooms: 4,
    bathrooms: 3,
    parkingSpaces: 3,
    area: 250,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 2,
    livingRooms: 2,
    kitchens: 1,
    zipCode: '04051-000',
    state: 'SP',
    streetNumber: '456',
    complement: '',
    description: 'Casa espaçosa com jardim e piscina',
    brokerName: 'Kelly',
    broker_login: 'kelly',
    thumbnail: '',
    created_at: Date.now()
  },
  {
    id: 'prop-003',
    title: 'Apartamento 2 Quartos - Vila Mariana',
    type: 'apartamento',
    price: 650000,
    location: 'Rua Vergueiro, 789',
    city: 'São Paulo',
    neighborhood: 'Vila Mariana',
    bedrooms: 2,
    bathrooms: 1,
    parkingSpaces: 1,
    area: 80,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 0,
    livingRooms: 1,
    kitchens: 1,
    zipCode: '01504-000',
    state: 'SP',
    streetNumber: '789',
    complement: 'Apto 202',
    description: 'Apartamento bem localizado próximo ao metrô',
    brokerName: 'Hanny',
    broker_login: 'hanny',
    thumbnail: '',
    created_at: Date.now()
  },
  {
    id: 'prop-004',
    title: 'Cobertura 3 Quartos - Itaim Bibi',
    type: 'cobertura',
    price: 2500000,
    location: 'Rua Joaquim Floriano, 1010',
    city: 'São Paulo',
    neighborhood: 'Itaim Bibi',
    bedrooms: 3,
    bathrooms: 3,
    parkingSpaces: 4,
    area: 200,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 2,
    livingRooms: 1,
    kitchens: 1,
    zipCode: '04534-000',
    state: 'SP',
    streetNumber: '1010',
    complement: 'Cobertura',
    description: 'Cobertura de luxo com terraço e vista incrível',
    brokerName: 'Kaua',
    broker_login: 'kaua',
    thumbnail: '',
    created_at: Date.now()
  },
  {
    id: 'prop-005',
    title: 'Apartamento 1 Quart - Pinheiros',
    type: 'apartamento',
    price: 450000,
    location: 'Rua Cardeal Arcoverde, 2020',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    bedrooms: 1,
    bathrooms: 1,
    parkingSpaces: 1,
    area: 55,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 0,
    livingRooms: 1,
    kitchens: 1,
    zipCode: '05407-000',
    state: 'SP',
    streetNumber: '2020',
    complement: 'Apto 303',
    description: 'Apartamento compacto e moderno',
    brokerName: 'Edyinvesti',
    broker_login: 'edyinvesti',
    thumbnail: '',
    created_at: Date.now()
  },
  {
    id: 'prop-006',
    title: 'Casa 2 Quartos - Brooklin',
    type: 'casa',
    price: 750000,
    location: 'Rua Otoni, 3030',
    city: 'São Paulo',
    neighborhood: 'Brooklin',
    bedrooms: 2,
    bathrooms: 2,
    parkingSpaces: 2,
    area: 150,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 1,
    livingRooms: 1,
    kitchens: 1,
    zipCode: '04565-000',
    state: 'SP',
    streetNumber: '3030',
    complement: '',
    description: 'Casa em condomínio fechado com lazer',
    brokerName: 'Samuel',
    broker_login: 'samuel',
    thumbnail: '',
    created_at: Date.now()
  },
  {
    id: 'prop-007',
    title: 'Apartamento 4 Quartos - Alphaville',
    type: 'apartamento',
    price: 1800000,
    location: 'Av. Pres. Juscelino Kubitschek, 4040',
    city: 'Barueri',
    neighborhood: 'Alphaville',
    bedrooms: 4,
    bathrooms: 3,
    parkingSpaces: 3,
    area: 180,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 2,
    livingRooms: 1,
    kitchens: 1,
    zipCode: '06455-000',
    state: 'SP',
    streetNumber: '4040',
    complement: 'Apto 404',
    description: 'Apartamento de alto padrão em condomínio exclusivo',
    brokerName: 'Kelly',
    broker_login: 'kelly',
    thumbnail: '',
    created_at: Date.now()
  },
  {
    id: 'prop-008',
    title: 'Studio - Consolação',
    type: 'studio',
    price: 350000,
    location: 'Rua da Consolação, 5050',
    city: 'São Paulo',
    neighborhood: 'Consolação',
    bedrooms: 1,
    bathrooms: 1,
    parkingSpaces: 0,
    area: 35,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 0,
    livingRooms: 1,
    kitchens: 1,
    zipCode: '01302-000',
    state: 'SP',
    streetNumber: '5050',
    complement: 'Studio',
    description: 'Studio mobiliado ideal para investimento',
    brokerName: 'Hanny',
    broker_login: 'hanny',
    thumbnail: '',
    created_at: Date.now()
  },
  {
    id: 'prop-009',
    title: 'Cobertura 2 Quartos - Vila Olímpia',
    type: 'cobertura',
    price: 980000,
    location: 'Rua Flórida, 6060',
    city: 'São Paulo',
    neighborhood: 'Vila Olímpia',
    bedrooms: 2,
    bathrooms: 2,
    parkingSpaces: 2,
    area: 110,
    sizeUnit: 'm²',
    status: 'disponivel',
    images: JSON.stringify([]),
    suites: 1,
    livingRooms: 1,
    kitchens: 1,
    zipCode: '04565-000',
    state: 'SP',
    streetNumber: '6060',
    complement: 'Cobertura',
    description: 'Cobertura com varanda e churrasqueira',
    brokerName: 'Kaua',
    broker_login: 'kaua',
    thumbnail: '',
    created_at: Date.now()
  }
];

const CAMPAIGNS = [
  {
    id: 'camp-001',
    property_id: 'prop-001',
    property_title: 'Apartamento 3 Quartos - Jardim Europa',
    instagram_status: 'PUBLISHED',
    instagram_post_id: 'ig-post-001',
    instagram_url: 'https://instagram.com/p/abc123',
    campaign_status: 'ACTIVE',
    campaign_id: 'fb-camp-001',
    has_carousel: 1,
    created_at: Date.now()
  },
  {
    id: 'camp-002',
    property_id: 'prop-002',
    property_title: 'Casa 4 Quartos - Moema',
    instagram_status: 'PUBLISHED',
    instagram_post_id: 'ig-post-002',
    instagram_url: 'https://instagram.com/p/def456',
    campaign_status: 'ACTIVE',
    campaign_id: 'fb-camp-002',
    has_carousel: 0,
    created_at: Date.now()
  },
  {
    id: 'camp-003',
    property_id: 'prop-003',
    property_title: 'Apartamento 2 Quartos - Vila Mariana',
    instagram_status: 'draft',
    instagram_post_id: '',
    instagram_url: '',
    campaign_status: 'pending',
    campaign_id: '',
    has_carousel: 0,
    created_at: Date.now()
  },
  {
    id: 'camp-004',
    property_id: 'prop-004',
    property_title: 'Cobertura 3 Quartos - Itaim Bibi',
    instagram_status: 'published',
    instagram_post_id: 'ig-post-004',
    instagram_url: 'https://instagram.com/p/ghi789',
    campaign_status: 'ACTIVE',
    campaign_id: 'fb-camp-004',
    has_carousel: 1,
    created_at: Date.now()
  }
];

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE RESTAURAÇÃO
// ═══════════════════════════════════════════════════════════════

async function restoreUsers() {
  console.log('\n👤 Restaurando corretores (brokers)...');
  for (const user of USERS) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO brokers (creci, login, password, name, email, phone, photo, lastActive, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [user.login, user.login, user.password, user.name, user.email, user.phone, user.photo, user.lastActive, Date.now()]
      });
      console.log(`  ✅ ${user.name} (${user.login})`);
    } catch (e) {
      console.error(`  ❌ Erro ao restaurar ${user.name}: ${e.message}`);
    }
  }
}

async function restoreProperties() {
  console.log('\n🏠 Restaurando properties...');
  for (const prop of PROPERTIES) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO properties (
                id, title, type, price, location, city, neighborhood,
                bedrooms, bathrooms, parkingSpaces, area, sizeUnit, status,
                images, suites, livingRooms, kitchens, zipCode, state,
                streetNumber, complement, description, brokerName, broker_login,
                thumbnail, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          prop.id, prop.title, prop.type, prop.price, prop.location, prop.city, prop.neighborhood,
          prop.bedrooms, prop.bathrooms, prop.parkingSpaces, prop.area, prop.sizeUnit, prop.status,
          prop.images, prop.suites, prop.livingRooms, prop.kitchens, prop.zipCode, prop.state,
          prop.streetNumber, prop.complement, prop.description, prop.brokerName, prop.broker_login,
          prop.thumbnail, prop.created_at
        ]
      });
      console.log(`  ✅ ${prop.title}`);
    } catch (e) {
      console.error(`  ❌ Erro ao restaurar ${prop.title}: ${e.message}`);
    }
  }
}

async function restoreCampaigns() {
  console.log('\n📢 Restaurando campaigns...');
  for (const camp of CAMPAIGNS) {
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO campaigns (
                id, property_id, property_title, instagram_status, instagram_post_id,
                instagram_url, campaign_status, campaign_id, has_carousel, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          camp.id, camp.property_id, camp.property_title, camp.instagram_status, camp.instagram_post_id,
          camp.instagram_url, camp.campaign_status, camp.campaign_id, camp.has_carousel, camp.created_at
        ]
      });
      console.log(`  ✅ ${camp.property_title}`);
    } catch (e) {
      console.error(`  ❌ Erro ao restaurar ${camp.property_title}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// VERIFICAÇÃO FINAL
// ═══════════════════════════════════════════════════════════════

async function verify() {
  console.log('\n═══ VERIFICAÇÃO FINAL ═══');
  
  const counts = {
    brokers: await client.execute('SELECT COUNT(*) as count FROM brokers'),
    properties: await client.execute('SELECT COUNT(*) as count FROM properties'),
    campaigns: await client.execute('SELECT COUNT(*) as count FROM campaigns')
  };
  
  console.log(`📊 Brokers: ${counts.brokers.rows[0].count} (esperado: 6)`);
  console.log(`📊 Properties: ${counts.properties.rows[0].count} (esperado: 9)`);
  console.log(`📊 Campaigns: ${counts.campaigns.rows[0].count} (esperado: 4)`);
  
  // Verificar integridade
  const fk = await client.execute('PRAGMA foreign_key_list');
  console.log(`\n🔗 Foreign Keys: ${fk.rows.length} configuradas`);
  
  const indexes = await client.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
  console.log(`📊 Indexes: ${indexes.rows.length} criados`);
}

// ═══════════════════════════════════════════════════════════════
// SCRIPT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

async function restore() {
  console.log('🔄 Iniciando restauração de dados...\n');
  
  await restoreUsers();
  await restoreProperties();
  await restoreCampaigns();
  await verify();
  
  console.log('\n✅ Restauração concluída com sucesso!');
  process.exit(0);
}

restore().catch(e => {
  console.error('\n❌ Erro fatal:', e.message);
  process.exit(1);
});
