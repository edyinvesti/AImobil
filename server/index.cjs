require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); // Importação do multer
const upload = multer({ dest: 'public/uploads/' }); // Configuração da pasta de destino

const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const bcrypt = require('bcryptjs');
const { HermesGateway } = require(path.join(__dirname, 'hermes-gateway-adapter.cjs'));

// ... (Mantenha o restante da sua lógica de TelegramService e classes aqui)

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: '10mb' }));

// AQUI ESTÁ A ROTA ATUALIZADA PARA O UPLOAD AUTOMÁTICO
app.post('/api/partner/properties', upload.single('image'), async (req, res) => {
  if (!DataEngine) return res.status(503).json({ error: 'DataEngine não disponível' });
  try {
    const property = req.body;
    // Se uma imagem foi enviada pelo formulário, salvamos o caminho
    if (req.file) {
      property.thumbnail = `/uploads/${req.file.filename}`;
    }
    if (!property.id) property.id = `prop_${Date.now()}`;
    await DataEngine.addProperty(property);
    logger.info('Property created with image', { propertyId: property.id });
    res.status(201).json({ success: true, propertyId: property.id, imageUrl: property.thumbnail });
  } catch (e) {
    logger.error('Partner property creation error', { error: e.message });
    res.status(500).json({ error: 'Erro ao salvar imóvel' });
  }
});

// ... (Continue o resto do seu arquivo original daqui para baixo)