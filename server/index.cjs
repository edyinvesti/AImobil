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
const { MarketingEngine } = require(path.join(__dirname, 'marketing-engine.cjs'));

// Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
console.log('[Cloudinary] Configurado:', !!process.env.CLOUDINARY_CLOUD_NAME, !!process.env.CLOUDINARY_API_KEY, !!process.env.CLOUDINARY_API_SECRET);

// Multer for video upload
const multer = require('multer');
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/quicktime' || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de vídeo são aceitos'));
    }
  }
});

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

async function initializeServices() {
  try {
    dataEngine = await getDataEngine();
    logger.info('DataEngine initialized successfully');

    // Initialize services
    authService = new AuthService(dataEngine);
    propertyService = new PropertyService(dataEngine);
    leadService = new LeadService(dataEngine);
    appointmentService = new AppointmentService(dataEngine);
    aiService = new AIService();
    
    const marketingEngine = new MarketingEngine(cloudinary);
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
    instagram: !!(process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ADS_ACCESS_TOKEN),
    metaAds: !!process.env.META_ADS_ACCESS_TOKEN
  }
})));

// ═══════════════════════════════════════════════════════════════
// API ROUTES — Registradas após initializeServices()
// ═══════════════════════════════════════════════════════════════

function registerRoutes() {
  // Auth routes (public)
  app.use('/api/auth', authLimiter, authRoutes(authService));

  // Protected routes
  app.use('/api/properties', propertyRoutes(propertyService, authMiddleware));

  // Serve media (image/video) from property data (used by marketing engine for Instagram/Facebook)
  app.get('/api/properties/:id/image', authMiddleware, async (req, res) => {
    try {
      if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
      const property = await dataEngine.getPropertyById(req.params.id);
      if (!property) return res.status(404).json({ error: 'Imóvel não encontrado' });
      if (!property.images || property.images.length === 0) return res.status(404).json({ error: 'Imóvel sem fotos' });

      const index = parseInt(req.query.index) || 0;
      if (index < 0 || index >= property.images.length) return res.status(404).json({ error: 'Índice inválido' });

      const raw = Buffer.isBuffer(property.images[index]) ? property.images[index].toString() : String(property.images[index]);
      const base64 = raw.replace(/^data:image\/\w+;base64,/, '').replace(/^data:application\/octet-stream;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');

      if (buffer.length === 0) return res.status(500).json({ error: 'Buffer vazio' });

      res.status(200);
      res.type('png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (e) {
      logger.error('Image serve error', { error: e.message, stack: e.stack });
      res.status(500).json({ error: 'Erro: ' + e.message });
    }
  });

  app.get('/api/properties/:id/video', async (req, res) => {
    try {
      if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
      const property = await dataEngine.getPropertyById(req.params.id);
      if (!property) return res.status(404).json({ error: 'Imóvel não encontrado' });
      if (!property.videoData) return res.status(404).json({ error: 'Imóvel sem vídeo' });

      const raw = Buffer.isBuffer(property.videoData) ? property.videoData.toString() : String(property.videoData);
      const base64 = raw.replace(/^data:video\/\w+;base64,/, '').replace(/^data:application\/octet-stream;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');

      if (buffer.length === 0) return res.status(500).json({ error: 'Buffer vazio' });

      res.status(200);
      res.type(property.videoType || 'video/mp4');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (e) {
      logger.error('Video serve error', { error: e.message, stack: e.stack });
      res.status(500).json({ error: 'Erro: ' + e.message });
    }
  });

  // POST /api/properties/:id/video — Upload video to Cloudinary
  app.post('/api/properties/:id/video', authMiddleware, videoUpload.single('video'), async (req, res) => {
    try {
      if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado' });

      const property = await dataEngine.getPropertyById(req.params.id);
      if (!property) return res.status(404).json({ error: 'Imóvel não encontrado' });

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          resource_type: 'video',
          folder: 'aimobil',
          public_id: `property_${req.params.id}`,
          eager: [{ streaming_profile: 'hd' }]
        }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
        stream.end(req.file.buffer);
      });

      // Save video_url to property
      await dataEngine.updatePropertyVideo(req.params.id, result.secure_url);

      // Gerar capa automática do vídeo via Cloudinary (start_offset 0 = 1º frame)
      const thumbnailUrl = cloudinary.url(result.public_id, { resource_type: 'video', format: 'jpg', start_offset: "0" });
      
      // Salvar a capa como a primeira imagem da galeria (para o painel mostrar e o post ter capa)
      if (typeof dataEngine.addPropertyImage === 'function') {
        await dataEngine.addPropertyImage(req.params.id, thumbnailUrl);
      }

      res.json({ video_url: result.secure_url, public_id: result.public_id, thumbnail_url: thumbnailUrl });
    } catch (e) {
      logger.error('Video upload error', { error: e.message, stack: e.stack });
      res.status(500).json({ error: 'Erro ao fazer upload do vídeo: ' + e.message });
    }
  });

  // DELETE /api/properties/:id/video — Delete video from Cloudinary
  app.delete('/api/properties/:id/video', authMiddleware, async (req, res) => {
    try {
      if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });

      const property = await dataEngine.getPropertyById(req.params.id);
      if (!property) return res.status(404).json({ error: 'Imóvel não encontrado' });
      if (!property.video_url) return res.status(404).json({ error: 'Imóvel sem vídeo no Cloudinary' });

      // Extract public_id from video_url
      // video_url format: https://res.cloudinary.com/dih8ifzph/video/upload/v1234/aimobil/property_xxx
      const urlParts = property.video_url.split('/');
      const publicId = urlParts.slice(urlParts.indexOf('aimobil')).join('/').replace(/\.[^/.]+$/, '');

      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      await dataEngine.updatePropertyVideo(req.params.id, null);

      res.json({ success: true });
    } catch (e) {
      logger.error('Video delete error', { error: e.message, stack: e.stack });
      res.status(500).json({ error: 'Erro ao remover vídeo: ' + e.message });
    }
  });

  app.use('/api/leads', leadRoutes(leadService, authMiddleware));
  app.use('/api/appointments', appointmentRoutes(appointmentService, authMiddleware));
  app.use('/api/marketing', marketingRoutes(marketingService, authMiddleware));

  // Telegram routes (webhook is public, status is protected)
  app.use('/api/telegram', telegramRoutes(telegramService));
}

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
        const bc = (p.brokerLogin || p.brokerCreci || p.broker_login || p.broker_creci || '').toString().trim().toLowerCase();
        const bName = (p.brokerName || '').toString().trim().toLowerCase();
        return bc === target || bName === target;
      });
      if (properties.length === 0) {
        const user = await dataEngine.validateBroker(login);
        if (user && user.name) {
          const userName = user.name.trim().toLowerCase();
          properties = (await dataEngine.getProperties()).filter(p => {
            const bName = (p.brokerName || '').toString().trim().toLowerCase();
            return bName === userName;
          });
        }
      }
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
    const result = await dataEngine.addProperty(property);
    if (!result) {
      return res.status(500).json({ error: 'Falha ao salvar imóvel no banco de dados' });
    }
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
    res.json({ success: true, images: property.images || [], videoData: property.videoData, videoType: property.videoType, videoUrl: property.videoUrl });
  } catch (e) {
    logger.error('Property image fetch error', { error: e.message });
    res.status(500).json({ error: 'Erro ao buscar imagens' });
  }
});

app.get('/api/partner/register', async (req, res, next) => {
  try {
    const login = req.query.login;
    if (!login) return res.status(400).json({ error: 'login obrigatório' });
    let broker = null;
    if (dataEngine) {
      broker = await dataEngine.getBroker(login);
      if (!broker) {
        broker = await dataEngine.getBrokerByName(login);
      }
      if (!broker) {
        const user = await dataEngine.validateBroker(login);
        if (user) {
          broker = user;
        }
      }
    }
    res.json({ success: true, broker });
  } catch (e) {
    logger.error('Get profile error', { error: e.message });
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

app.post('/api/partner/register', async (req, res, next) => {
  try {
    const profile = req.body;
    if (!profile.login) return res.status(400).json({ error: 'login obrigatório' });
    if (dataEngine) {
      await dataEngine.saveBroker({
        creci: profile.login,
        login: profile.login,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        photo: profile.photo || '',
        password: profile.password || '',
      });
    }
    logger.info('Profile saved', { login: profile.login });
    res.json({ success: true });
  } catch (e) {
    logger.error('Save profile error', { error: e.message });
    res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TELEGRAM PROFILE LINKING
// ═══════════════════════════════════════════════════════════════

app.get('/api/profile/telegram-id', authMiddleware, async (req, res) => {
  try {
    if (!dataEngine) return res.json({ telegramId: null });
    const user = await dataEngine.getTelegramUserByLogin(req.user.login);
    res.json({ telegramId: user?.chat_id ? String(user.chat_id) : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/profile/telegram-id', authMiddleware, async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'telegramId é obrigatório' });
    if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
    await dataEngine.linkUserToTelegram(req.user.login, telegramId);
    logger.info('Telegram ID linked', { login: req.user.login, chatId: telegramId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/telegram/analytics', authMiddleware, (req, res) => {
  const analytics = telegramService?.getAnalytics() || {};
  res.json({
    configured: !!process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'iamobil_br_bot',
    ...analytics
  });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT ROUTE
// ═══════════════════════════════════════════════════════════════

app.get('/api/properties/export', authMiddleware, async (req, res) => {
  try {
    if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
    const properties = await dataEngine.getProperties();
    const fields = ['id', 'title', 'type', 'price', 'status', 'city', 'neighborhood', 'address', 'bedrooms', 'bathrooms', 'parkingSpaces', 'size', 'brokerName', 'brokerLogin', 'createdAt'];
    const csv = [fields.join(','),
      ...properties.map(p => fields.map(f => {
        const val = p[f] ?? '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') ? `"${str}"` : str;
      }).join(','))
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=imoveis.csv');
    res.send('\uFEFF' + csv);
  } catch (e) {
    logger.error('Export error', { error: e.message });
    res.status(500).json({ error: 'Erro ao exportar' });
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
    const available = aiService.getAvailableProviders();
    res.json({ response, providers: available });
  } catch (e) {
    res.status(500).json({ response: null, error: 'Erro no servidor de IA: ' + e.message });
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
// (Movido para dentro do start() para não interceptar as rotas da API)

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

async function start() {
  await initializeServices();
  registerRoutes();
  
  // O catch-all do frontend DEVE ser a última rota registrada antes dos error handlers
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });

  app.use(notFound);
  app.use(errorHandler);
  
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    
    // Configurar webhook do Telegram após servidor iniciar
    if (telegramService) {
      const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
      telegramService.setupWebhook(webhookUrl);
    }
  });
}

start().catch(e => {
  logger.error('Failed to start server:', e.message);
  process.exit(1);
});

module.exports = app;
