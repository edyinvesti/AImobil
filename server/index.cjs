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
const multer = require('multer');
const { MarketingEngine } = require(path.join(__dirname, 'marketing-engine.cjs'));

// Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer (memory storage) for video upload
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
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
    
    const marketingEngine = new MarketingEngine(cloudinary);
    marketingService = new MarketingService(dataEngine, marketingEngine);
    
    telegramService = new TelegramService(dataEngine, aiService);

    logger.info('All services initialized successfully');
  } catch (e) {
    logger.error('Failed to initialize services:', e.message);
    logger.warn('Running in limited mode');
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
// API ROUTES — Registradas após initializeServices()
// ═══════════════════════════════════════════════════════════════

function registerRoutes() {
  // Auth routes (public)
  app.use('/api/auth', authLimiter, authRoutes(authService));

  // Protected routes
  app.use('/api/properties', propertyRoutes(propertyService, authMiddleware));

  // Serve media (image/video) from property data (used by marketing engine for Instagram/Facebook)
  app.get('/api/properties/:id/image', async (req, res) => {
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

      // Se tem URL do Cloudinary, redireciona
      if (property.videoUrl && property.videoUrl.startsWith('http')) {
        return res.redirect(302, property.videoUrl);
      }

      // Fallback: serve base64 legado do banco
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

  // Upload de vídeo para Cloudinary
  app.post('/api/properties/:id/video', videoUpload.single('video'), async (req, res) => {
    try {
      if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado' });

      const property = await dataEngine.getPropertyById(req.params.id);
      if (!property) return res.status(404).json({ error: 'Imóvel não encontrado' });

      logger.info('Iniciando upload de vídeo para Cloudinary', { propertyId: req.params.id, size: req.file.size });

      // Upload para Cloudinary
      const videoUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          resource_type: 'video',
          folder: 'aimobil',
          public_id: `property_${req.params.id}`,
          overwrite: true,
          format: 'mp4'
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        });
        stream.end(req.file.buffer);
      });

      // Salva URL no banco
      await dataEngine.updatePropertyVideo(req.params.id, videoUrl);

      logger.info('Vídeo enviado ao Cloudinary com sucesso', { propertyId: req.params.id, videoUrl });
      res.json({ success: true, videoUrl });
    } catch (e) {
      logger.error('Video upload error', { error: e.message });
      res.status(500).json({ error: 'Erro ao enviar vídeo: ' + e.message });
    }
  });

  // Delete vídeo do Cloudinary
  app.delete('/api/properties/:id/video', async (req, res) => {
    try {
      if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
      const publicId = `aimobil/property_${req.params.id}`;
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      } catch (e) {
        logger.warn('Cloudinary delete failed (maybe already deleted)', { error: e.message });
      }
      await dataEngine.updatePropertyVideo(req.params.id, '');
      res.json({ success: true });
    } catch (e) {
      logger.error('Video delete error', { error: e.message });
      res.status(500).json({ error: 'Erro ao deletar vídeo: ' + e.message });
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

app.get('/api/partner/properties', async (req, res, next) => {
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

app.post('/api/partner/properties', async (req, res, next) => {
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

app.delete('/api/partner/properties', async (req, res, next) => {
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

app.get('/api/partner/properties/status', async (req, res, next) => {
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

app.get('/api/partner/property-image', async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const property = await dataEngine.getPropertyById(id);
    if (!property) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json({ success: true, images: property.images || [], videoData: property.videoData, videoType: property.videoType });
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

// Image upload (Imgur fallback to base64)
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

app.post('/api/properties/upload-image', async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Imagem não enviada' });

    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    let url = null;

    if (IMGUR_CLIENT_ID) {
      try {
        const imgurRes = await fetch('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: {
            'Authorization': 'Client-ID ' + IMGUR_CLIENT_ID,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ image: base64, type: 'base64' })
        });
        const imgurData = await imgurRes.json();
        if (imgurData.success && imgurData.data?.link) {
          url = imgurData.data.link;
        }
      } catch (e) {
        logger.warn('[Upload] Imgur failed, using base64');
      }
    }

    if (url) {
      res.json({ success: true, url });
    } else {
      res.json({ success: true, url: image });
    }
  } catch (e) {
    logger.error('Image upload error', { error: e.message });
    res.status(500).json({ error: 'Erro ao fazer upload' });
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
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(e => {
  logger.error('Failed to start server:', e.message);
  process.exit(1);
});

module.exports = app;
