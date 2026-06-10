const PORT = process.env.PORT || 10002;
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Services
const { getDataEngine } = require(path.join(__dirname, 'db/index.cjs'));
const AuthService = require(path.join(__dirname, 'services/auth.service.cjs'));
const PropertyService = require(path.join(__dirname, 'services/property.service.cjs'));
const LeadService = require(path.join(__dirname, 'services/lead.service.cjs'));
const AppointmentService = require(path.join(__dirname, 'services/appointment.service.cjs'));
const AIService = require(path.join(__dirname, 'services/ai.service.cjs'));
const TelegramService = require(path.join(__dirname, 'services/telegram.service.cjs'));
const MarketingService = require(path.join(__dirname, 'services/marketing.service.cjs'));
const StorageService = require(path.join(__dirname, 'services/storage.service.cjs'));
const { MarketingEngine } = require(path.join(__dirname, 'marketing-engine.cjs'));

// Middleware
const { authMiddleware } = require(path.join(__dirname, 'middleware/auth.middleware.cjs'));
const { errorHandler, notFound } = require(path.join(__dirname, 'middleware/error.middleware.cjs'));

// Routes
const healthRoutes = require(path.join(__dirname, 'routes/health.routes.cjs'));
const authRoutes = require(path.join(__dirname, 'routes/auth.routes.cjs'));
const propertyRoutes = require(path.join(__dirname, 'routes/property.routes.cjs'));
const leadRoutes = require(path.join(__dirname, 'routes/lead.routes.cjs'));
const appointmentRoutes = require(path.join(__dirname, 'routes/appointment.routes.cjs'));
const marketingRoutes = require(path.join(__dirname, 'routes/marketing.routes.cjs'));
const telegramRoutes = require(path.join(__dirname, 'routes/telegram.routes.cjs'));

// Logger
const logger = require(path.join(__dirname, 'utils/logger.cjs'));

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174'];

logger.info('Server starting', { 
  port: PORT, 
  corsOrigins: allowedOrigins 
});

const app = express();

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas tentativas de login. Tente novamente mais tarde.'
});

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// ═══════════════════════════════════════════════════════════════
// INITIALIZE SERVICES
// ═══════════════════════════════════════════════════════════════

let dataEngine = null;
let authService = null;
let propertyService = null;
let leadService = null;
let appointmentService = null;
let aiService = null;
let telegramService = null;
let marketingService = null;
let storageService = null;

async function initializeServices() {
  try {
    dataEngine = await getDataEngine();
    logger.info('DataEngine initialized successfully');

    // Initialize storage service
    storageService = new StorageService();
    logger.info('Storage service initialized', { configured: storageService.configured });

    // Initialize services
    authService = new AuthService(dataEngine);
    propertyService = new PropertyService(dataEngine, storageService);
    leadService = new LeadService(dataEngine);
    appointmentService = new AppointmentService(dataEngine);
    aiService = new AIService();
    
    const marketingEngine = new MarketingEngine();
    marketingService = new MarketingService(dataEngine, marketingEngine);
    
    telegramService = new TelegramService(dataEngine, aiService);

    logger.info('All services initialized successfully');
  } catch (e) {
    logger.error('Failed to initialize services:', e.message);
    console.log('Warning: Running in limited mode');
  }
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

app.use('/api/health', healthRoutes(async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  services: {
    dataEngine: !!dataEngine,
    ai: aiService?.getAvailableProviders() || [],
    telegram: !!process.env.TELEGRAM_BOT_TOKEN,
    instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    metaAds: !!process.env.META_ADS_ACCESS_TOKEN,
    storage: storageService?.getStatus() || { configured: false }
  }
})));

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Auth routes (public)
app.use('/api/auth', authLimiter, authRoutes(authService));

// Protected routes
app.use('/api/properties', propertyRoutes(propertyService, authMiddleware));
app.use('/api/leads', leadRoutes(leadService, authMiddleware));
app.use('/api/appointments', appointmentRoutes(appointmentService, authMiddleware));
app.use('/api/marketing', marketingRoutes(marketingService, authMiddleware));

// Telegram routes (webhook is public, status is protected)
app.use('/api/telegram', telegramRoutes(telegramService));

// ═══════════════════════════════════════════════════════════════
// LEGACY PARTNER ROUTES (compatibilidade com frontend)
// ═══════════════════════════════════════════════════════════════

app.get('/api/partner/properties', authMiddleware, async (req, res, next) => {
  try {
    let properties = await dataEngine.getProperties();
    const login = req.query?.login || req.query?.creci;
    if (login && login.trim()) {
      const target = login.trim().toLowerCase();
      properties = properties.filter(p => {
        const bc = (p.brokerLogin || p.brokerCreci || '').toString().trim().toLowerCase();
        const b_c = (p.broker_login || p.broker_creci || '').toString().trim().toLowerCase();
        return bc === target || b_c === target;
      });
    }
    res.json({ success: true, count: properties.length, properties });
  } catch (e) {
    logger.error('Partner properties fetch error', { error: e.message });
    res.status(500).json({ error: 'Erro ao buscar imóveis' });
  }
});

app.post('/api/partner/properties', authMiddleware, async (req, res, next) => {
  try {
    const property = req.body;
    if (!property.id) property.id = `prop_${Date.now()}`;
    const MAX_IMAGES = 10;
    const images = property.images || [];
    if (Array.isArray(images) && images.length > MAX_IMAGES) {
      return res.status(400).json({ error: `Máximo de ${MAX_IMAGES} fotos por imóvel. Você enviou ${images.length}.` });
    }
    await dataEngine.addProperty(property);
    logger.info('Property created via Partner API', { propertyId: property.id });
    res.status(201).json({ success: true, propertyId: property.id });
  } catch (e) {
    logger.error('Partner property creation error', { error: e.message });
    res.status(500).json({ error: 'Erro ao salvar imóvel' });
  }
});

app.delete('/api/partner/properties', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    await dataEngine.deleteProperty(id);
    logger.info('Property deleted via Partner API', { propertyId: id });
    res.json({ success: true, deleted: id });
  } catch (e) {
    logger.error('Property deletion error', { error: e.message });
    res.status(500).json({ error: 'Erro ao deletar imóvel' });
  }
});

app.get('/api/partner/properties/status', authMiddleware, async (req, res, next) => {
  try {
    const properties = await dataEngine.getProperties();
    const statuses = {};
    properties.forEach(p => {
      statuses[p.id] = p.status || 'approved';
    });
    res.json({ success: true, statuses });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

app.get('/api/partner/property-image', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const property = await dataEngine.getPropertyById(id);
    if (!property) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json({ success: true, images: property.images || [] });
  } catch (e) {
    logger.error('Property image fetch error', { error: e.message });
    res.status(500).json({ error: 'Erro ao buscar imagens' });
  }
});

// ═══════════════════════════════════════════════════════════════
// LEGACY ROUTES (compatibilidade)
// ═══════════════════════════════════════════════════════════════

// AI Chat endpoint
app.post('/api/ai/process', authMiddleware, async (req, res, next) => {
  try {
    const { message, context } = req.body;
    const response = await aiService.process(message, context);
    res.json({ response });
  } catch (e) {
    next(e);
  }
});

// Marketing engine status
app.get('/api/marketing/status', authMiddleware, async (req, res, next) => {
  try {
    const status = await marketingService.getStatus();
    res.json(status);
  } catch (e) {
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════
// SERVE FRONTEND
// ═══════════════════════════════════════════════════════════════

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

app.use(notFound);
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

async function start() {
  await initializeServices();
  
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start().catch(e => {
  logger.error('Failed to start server:', e.message);
  process.exit(1);
});

module.exports = app;
