const PORT = process.env.PORT || 10002;
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const bcrypt = require('bcryptjs');
const { HermesGateway } = require(path.join(__dirname, 'hermes-gateway-adapter.cjs'));
const { DataEngine } = require(path.join(__dirname, 'data_engine.cjs'));
const { MarketingEngine } = require(path.join(__dirname, 'marketing-engine.cjs'));
const { validateUser } = require(path.join(__dirname, '../api/_lib/db.js'));

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      )
    })
  ]
});

// TelegramService inline
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];

logger.info('Server starting', { 
  port: PORT, 
  geminiConfigured: !!GEMINI_API_KEY,
  telegramConfigured: !!TELEGRAM_BOT_TOKEN,
  corsOrigins: allowedOrigins 
});

const hermes = new HermesGateway();
const app = express();
const BCRYPT_ROUNDS = 10;
const dataEngine = new DataEngine();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Muitas tentativas de login. Tente novamente mais tarde.'
});

// Parse JSON body (aumentado para 50MB para suportar fotos base64)
app.use(express.json({ limit: '50mb' }));

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, '../dist')));

// TelegramService stub - minimal implementation
const telegramService = {
  sendMessage: async (chatId, text, options = {}) => {
    if (!TELEGRAM_BOT_TOKEN) return { ok: false };
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4096), ...options })
        }
      );
      return await response.json();
    } catch (e) {
      logger.error('TelegramService sendMessage error', { error: e.message });
      return { ok: false };
    }
  },
  sendPhoto: async (chatId, photo, caption, options = {}) => {
    if (!TELEGRAM_BOT_TOKEN) return { ok: false };
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, photo, caption: String(caption).slice(0, 1024), ...options })
        }
      );
      return await response.json();
    } catch (e) {
      logger.error('TelegramService sendPhoto error', { error: e.message });
      return { ok: false };
    }
  },
  clearConversation: (chatId) => {
    // Stub - conversation history not implemented
  },
  addToConversation: (chatId, role, content) => {
    // Stub - conversation history not implemented
  },
  getConversationHistory: (chatId) => [],
  sendWelcomeMessage: async (chatId, username) => {
    return telegramService.sendMessage(chatId, `Bem-vindo ao IAmobil Gestor, ${username}!`);
  },
  sendHelpMessage: async (chatId) => {
    return telegramService.sendMessage(chatId, 'Comandos disponíveis:\n/start - Iniciar\n/imoveis - Ver imóveis\n/leads - Ver leads\n/agenda - Ver agendamentos\n/dashboard - Dashboard');
  },
  getMainKeyboard: () => ({ keyboard: [['🏠 Meus Imóveis', '👥 Meus Leads'], ['📅 Agendamentos', '📊 Dashboard']], resize_keyboard: true }),
  getBackKeyboard: () => ({ keyboard: [['🔙 Menu Principal']], resize_keyboard: true }),
  trackAnalytics: (command) => {
    // Stub - analytics not implemented
  },
  getAnalytics: () => ({ messagesReceived: 0, messagesSent: 0, activeConversations: 0, uptime: process.uptime() })
};

const telegramUsers = new Map();
const rateLimitTracker = new Map();
const userTranslations = new Map();

function checkUserRateLimit(chatId) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxMessages = 30;
  
  if (!rateLimitTracker.has(chatId)) {
    rateLimitTracker.set(chatId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  const tracker = rateLimitTracker.get(chatId);
  
  if (now > tracker.resetAt) {
    rateLimitTracker.set(chatId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (tracker.count >= maxMessages) {
    return false;
  }
  
  tracker.count++;
  return true;
}

function translate(text, lang) {
  const translations = {
    pt: {
      start: 'Iniciar conversa',
      help: 'Central de Ajuda',
      properties: 'Seus Imóveis',
      leads: 'Seus Leads',
      appointments: 'Seus Agendamentos',
      dashboard: 'Resumo Geral',
      settings: 'Configurações',
      welcome: 'Bem-vindo ao IAmobil Gestor!'
    },
    en: {
      start: 'Start conversation',
      help: 'Help Center',
      properties: 'Your Properties',
      leads: 'Your Leads',
      appointments: 'Your Appointments',
      dashboard: 'General Summary',
      settings: 'Settings',
      welcome: 'Welcome to IAmobil Gestor!'
    },
    es: {
      start: 'Iniciar conversación',
      help: 'Centro de Ayuda',
      properties: 'Tus Inmuebles',
      leads: 'Tus Leads',
      appointments: 'Tus Citas',
      dashboard: 'Resumen General',
      settings: 'Configuración',
      welcome: '¡Bienvenido a IAmobil Gestor!'
    }
  };
  
  return translations[lang]?.[text] || translations.pt[text] || text;
}

async function processWithAI(message, context = {}) {
  const systemPrompt = `Você é o Hermes, assistente inteligente da IAmobil - plataforma de gestão imobiliária. 
Ajude o usuário com:
- Informações sobre imóveis
- Agendamento de visitas
- Consulta de leads
- Dúvidas sobre o sistema

Seja breve, profissional e responda sempre em português brasileiro.
Evite usar markdown complexo que possa causar erros de parsing.`;

  if (MISTRAL_API_KEY) {
    try {
      const response = await fetch(
        'https://api.mistral.ai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MISTRAL_API_KEY}`
          },
          body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1024
          })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        logger.warn('Mistral error', { error: data.error.message });
        if (GROQ_API_KEY) return await processWithAIGroq(message, systemPrompt);
        if (GEMINI_API_KEY) return await processWithAIGemini(message, systemPrompt);
        return `Erro: ${data.error.message}`;
      }

      return data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua solicitação.";
    } catch (e) {
      logger.error('Mistral processing error', { error: e.message });
      if (GROQ_API_KEY) return await processWithAIGroq(message, systemPrompt);
      if (GEMINI_API_KEY) return await processWithAIGemini(message, systemPrompt);
      return `Erro ao processar: ${e.message}`;
    }
  } else if (GROQ_API_KEY) {
    return await processWithAIGroq(message, systemPrompt);
  } else if (GEMINI_API_KEY) {
    return await processWithAIGemini(message, systemPrompt);
  }
  
  return "IA não configurada. Contacte o administrador.";
}

async function processWithAIGemini(message, systemPrompt) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return `Erro: ${data.error.message}`;
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || 
           "Desculpe, não consegui processar sua solicitação.";
  } catch (e) {
    logger.error('Gemini processing error', { error: e.message });
    return `Erro ao processar: ${e.message}`;
  }
}

async function processWithAIGroq(message, systemPrompt) {
  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      logger.warn('Groq error', { error: data.error.message });
      if (GEMINI_API_KEY) return await processWithAIGemini(message, systemPrompt);
      return `Erro: ${data.error.message}`;
    }

    return data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua solicitação.";
  } catch (e) {
    logger.error('Groq processing error', { error: e.message });
    if (GEMINI_API_KEY) return await processWithAIGemini(message, systemPrompt);
    return `Erro ao processar: ${e.message}`;
  }
}

async function setupTelegramWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN not configured');
    return;
  }
  
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  
  if (webhookUrl) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl })
        }
      );
      const result = await response.json();
      logger.info('Telegram webhook configured', { ok: result.ok, description: result.description });
    } catch (e) {
      logger.error('Failed to configure Telegram webhook', { error: e.message });
    }
  } else {
    logger.info('No webhook URL configured, starting polling mode');
    startPolling();
  }
}

let pollingOffset = 0;
let pollingInterval = null;
let pollingActive = true;

async function startPolling() {
  const poll = async () => {
    if (!pollingActive) return;
    
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${pollingOffset}&timeout=10`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        await new Promise(r => setTimeout(r, 5000));
        return;
      }
      
      const data = await response.json();
if (!data.ok || !data.result?.length) {
        pollingActive = true;
        return;
      }
      
      for (const update of data.result) {
        pollingOffset = update.update_id + 1;
        
        if (update.message) {
          await handleTelegramMessage(update.message);
        }
      }
      
      pollingActive = true;
    } catch (e) {
      logger.error('Polling error', { error: e.message });
      await new Promise(r => setTimeout(r, 5000));
    }
  };
  
  pollingInterval = setInterval(poll, 2000);
  poll();
}

async function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  let text = message.text || '';
  const username = message.chat.username || message.chat.first_name || 'Usuário';
  
  text = sanitizeInput(text);
  
  if (!checkUserRateLimit(chatId)) {
    await telegramService.sendMessage(chatId, '⏳ Muitas mensagens. Aguarde um momento.');
    return;
  }
  
  const userLang = userTranslations.get(chatId) || 'pt';
  telegramService.trackAnalytics(text.split(' ')[0]);
  logger.info('Telegram message received', { chatId, text: text.slice(0, 50) });

  const commands = {
    '/start': async () => {
      telegramService.clearConversation(chatId);
      telegramUsers.set(chatId, { username, startTime: Date.now() });
      await telegramService.sendWelcomeMessage(chatId, username);
    },
    '/help': async () => {
      await telegramService.sendHelpMessage(chatId);
    },
    '/limpar': async () => {
      telegramService.clearConversation(chatId);
      await telegramService.sendMessage(chatId, '🗑️ Histórico limpo!', {
        reply_markup: telegramService.getMainKeyboard()
      });
    },
    '/imoveis': async () => {
      await handleListProperties(chatId);
    },
    '/leads': async () => {
      await handleListLeads(chatId);
    },
    '/agenda': async () => {
      await handleListAppointments(chatId);
    },
    '/dashboard': async () => {
      await handleDashboard(chatId);
    },
    '/stats': async () => {
      await handleStats(chatId);
    },
    '/idioma': async () => {
      const nextLang = userLang === 'pt' ? 'en' : userLang === 'en' ? 'es' : 'pt';
      userTranslations.set(chatId, nextLang);
      const langNames = { pt: 'Português', en: 'English', es: 'Español' };
      await telegramService.sendMessage(chatId, `🌐 Idioma: ${langNames[nextLang]}`, {
        reply_markup: telegramService.getMainKeyboard()
      });
    },
    '/buscar': async () => {
      await telegramService.sendMessage(chatId, '🔍 *Busca de Imóveis*\n\nUse:\n`/buscar casa goiania`\n`/buscar apartamento 500000`\n`/buscar terreno`', {
        reply_markup: telegramService.getBackKeyboard()
      });
    },
    '🏠 Meus Imóveis': async () => {
      await handleListProperties(chatId);
    },
    '👥 Meus Leads': async () => {
      await handleListLeads(chatId);
    },
    '📅 Agendamentos': async () => {
      await handleListAppointments(chatId);
    },
    '📊 Dashboard': async () => {
      await handleDashboard(chatId);
    },
    '❓ Ajuda': async () => {
      await telegramService.sendHelpMessage(chatId);
    },
    '⚙️ Configurações': async () => {
      await handleSettings(chatId);
    },
    '🔙 Menu Principal': async () => {
      await telegramService.sendMessage(chatId, ' Menu Principal:', {
        reply_markup: telegramService.getMainKeyboard()
      });
    }
  };

  if (text.startsWith('/buscar ')) {
    await handleSearch(chatId, text.replace('/buscar ', ''));
    return;
  }

  if (commands[text]) {
    await commands[text]();
    return;
  }

  telegramService.addToConversation(chatId, 'user', text);
  const history = telegramService.getConversationHistory(chatId);
  
  let contextPrompt = text;
  if (history.length > 1) {
    const previousMessages = history.slice(-6, -1).map(m => `${m.role}: ${m.content}`).join('\n');
    contextPrompt = `Histórico:\n${previousMessages}\n\nUsuário: ${text}`;
  }

  if (!GEMINI_API_KEY) {
    await telegramService.sendMessage(chatId, '⚠️ IA não configurada.');
    return;
  }

  try {
    const reply = await processWithAI(contextPrompt);
    telegramService.addToConversation(chatId, 'assistant', reply);
    await telegramService.sendMessage(chatId, reply, {
      reply_markup: telegramService.getMainKeyboard()
    });
    logger.info('AI response sent', { chatId, replyLength: reply.length });
  } catch (e) {
    logger.error('AI response error', { error: e.message });
    await telegramService.sendMessage(chatId, '❌ Erro ao processar. Tente novamente.');
  }
}

async function handleSearch(chatId, query) {
  if (!dataEngine) {
    await telegramService.sendMessage(chatId, '📭 Sistema de busca indisponível.', {
      reply_markup: telegramService.getBackKeyboard()
    });
    return;
  }

  try {
    const properties = await dataEngine.getProperties();
    const terms = query.toLowerCase().split(' ');
    
    const results = properties.filter(p => {
      const searchable = `${p.title} ${p.address} ${p.city || ''} ${p.type || ''}`.toLowerCase();
      return terms.some(term => searchable.includes(term)) ||
             (p.price && terms.some(term => !isNaN(term) && p.price <= parseFloat(term)));
    });

    if (!results.length) {
      await telegramService.sendMessage(chatId, `🔍 Nenhum imóvel encontrado para "${query}"`, {
        reply_markup: telegramService.getBackKeyboard()
      });
      return;
    }

    let message = `🔍 *Resultados para "${query}"*\n\n`;
    results.slice(0, 5).forEach((p, i) => {
      const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0);
      message += `${i + 1}. *${p.title}*\n   ${price}\n   📍 ${p.city || p.address || 'N/C'}\n\n`;
    });

    await telegramService.sendMessage(chatId, message, {
      reply_markup: telegramService.getBackKeyboard()
    });
  } catch (e) {
    logger.error('Search error', { error: e.message });
    await telegramService.sendMessage(chatId, '❌ Erro na busca.', {
      reply_markup: telegramService.getBackKeyboard()
    });
  }
}

async function handleListProperties(chatId) {
  if (!dataEngine) {
    await telegramService.sendMessage(chatId, '📭 Nenhum imóvel cadastrado.', {
      reply_markup: telegramService.getBackKeyboard()
    });
    return;
  }

  try {
    const properties = await dataEngine.getProperties();
    
    if (!properties.length) {
      await telegramService.sendMessage(chatId, '📭 Nenhum imóvel cadastrado.', {
        reply_markup: telegramService.getBackKeyboard()
      });
      return;
    }

    let message = '🏠 *Seus Imóveis*\n\n';
    properties.slice(0, 5).forEach((p, i) => {
      const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0);
      message += `${i + 1}. *${p.title}*\n`;
      message += `   💰 ${price}\n`;
      message += `   📍 ${p.city || p.address || 'Localização não informada'}\n`;
      message += `   📌 Status: ${p.status || 'Disponível'}\n\n`;
    });

    if (properties.length > 5) {
      message += `_Mostrando 5 de ${properties.length} imóveis_\n\n`;
      message += `Use /buscar para filtrar`;
    }

    await telegramService.sendMessage(chatId, message, {
      reply_markup: telegramService.getBackKeyboard()
    });

    if (properties[0]?.images) {
      const firstProp = properties[0];
      await telegramService.sendPhoto(chatId, firstProp.images, `📷 Foto de ${firstProp.title}`, {
        reply_markup: telegramService.getBackKeyboard()
      });
    }
  } catch (e) {
    logger.error('Properties fetch error', { error: e.message });
    await telegramService.sendMessage(chatId, '❌ Erro ao buscar imóveis.', {
      reply_markup: telegramService.getBackKeyboard()
    });
  }
}

async function handleListLeads(chatId) {
  if (!dataEngine) {
    await telegramService.sendMessage(chatId, '📭 Nenhum lead cadastrado.', {
      reply_markup: telegramService.getBackKeyboard()
    });
    return;
  }

  try {
    const leads = await dataEngine.getLeads();
    
    if (!leads.length) {
      await telegramService.sendMessage(chatId, '📭 Nenhum lead encontrado.', {
        reply_markup: telegramService.getBackKeyboard()
      });
      return;
    }

    const statusEmoji = { 'quente': '🔥', 'morno': '🌡️', 'frio': '❄️', 'novo': '🆕', 'convertido': '✅' };
    
    let message = '👥 *Seus Leads*\n\n';
    leads.slice(0, 5).forEach((l, i) => {
      message += `${i + 1}. *${l.name}*\n`;
      message += `   📞 ${l.phone || l.contact || 'Não informado'}\n`;
      message += `   🎯 ${l.notes || 'A definir'}\n`;
      message += `   ${statusEmoji[l.status] || '📌'} Score: ${l.score || 'N/C'}\n\n`;
    });

    if (leads.length > 5) {
      message += `_Mostrando 5 de ${leads.length} leads_`;
    }

    await telegramService.sendMessage(chatId, message, {
      reply_markup: telegramService.getBackKeyboard()
    });
  } catch (e) {
    logger.error('Leads fetch error', { error: e.message });
    await telegramService.sendMessage(chatId, '❌ Erro ao buscar leads.', {
      reply_markup: telegramService.getBackKeyboard()
    });
  }
}

async function handleListAppointments(chatId) {
  if (!dataEngine) {
    await telegramService.sendMessage(chatId, '📭 Nenhum agendamento.', {
      reply_markup: telegramService.getBackKeyboard()
    });
    return;
  }

  try {
    const appointments = await dataEngine.getAppointments();
    
    if (!appointments.length) {
      await telegramService.sendMessage(chatId, '📭 Nenhum agendamento.', {
        reply_markup: telegramService.getBackKeyboard()
      });
      return;
    }

    let message = '📅 *Seus Agendamentos*\n\n';
    appointments.slice(0, 5).forEach((a, i) => {
      message += `${i + 1}. *${a.lead_id || 'Cliente'}*\n`;
      message += `   🏠 Imóvel: ${a.property_id || 'A definir'}\n`;
      message += `   📆 ${a.date || 'Data'}\n\n`;
    });

    if (appointments.length > 5) {
      message += `_Mostrando 5 de ${appointments.length} agendamentos_`;
    }

    await telegramService.sendMessage(chatId, message, {
      reply_markup: telegramService.getBackKeyboard()
    });
  } catch (e) {
    logger.error('Appointments fetch error', { error: e.message });
    await telegramService.sendMessage(chatId, '❌ Erro ao buscar agendamentos.', {
      reply_markup: telegramService.getBackKeyboard()
    });
  }
}

async function handleDashboard(chatId) {
  let propertiesCount = 0;
  let leadsCount = 0;
  let appointmentsCount = 0;
  let hotLeads = 0;

  if (dataEngine) {
    try {
      const [properties, leads, appointments] = await Promise.all([
        dataEngine.getProperties().catch(() => []),
        dataEngine.getLeads().catch(() => []),
        dataEngine.getAppointments().catch(() => [])
      ]);
      propertiesCount = properties.length;
      leadsCount = leads.length;
      appointmentsCount = appointments.length;
      hotLeads = leads.filter(l => l.status === 'quente').length;
    } catch (e) {
      logger.warn('Dashboard data fetch partial error', { error: e.message });
    }
  }

  const analytics = telegramService.getAnalytics();
  const uptimeHours = Math.floor(analytics.uptime / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((analytics.uptime % (1000 * 60 * 60)) / (1000 * 60));

  const message = `📊 *Dashboard IAmobil*\n\n` +
    `*Visão Geral:*\n\n` +
    `🏠 Imóveis: ${propertiesCount}\n` +
    `👥 Leads: ${leadsCount} (🔥 ${hotLeads} quentes)\n` +
    `📅 Agendamentos: ${appointmentsCount}\n\n` +
    `*Estatísticas do Bot:*\n\n` +
    `💬 Recebidas: ${analytics.messagesReceived}\n` +
    `📤 Enviadas: ${analytics.messagesSent}\n` +
    `💭 Conversas: ${analytics.activeConversations}\n` +
    `⏱️ Uptime: ${uptimeHours}h ${uptimeMinutes}m`;

  await telegramService.sendMessage(chatId, message, {
    reply_markup: telegramService.getMainKeyboard()
  });
}

async function handleStats(chatId) {
  const analytics = telegramService.getAnalytics();
  const topCommands = Object.entries(analytics.commandsUsed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let message = `📈 *Estatísticas*\n\n`;
  message += `💬 Total: ${analytics.messagesReceived}\n`;
  message += `📤 Enviadas: ${analytics.messagesSent}\n`;
  message += `💭 Conversas: ${analytics.activeConversations}\n\n`;
  message += `*Comandos mais usados:*\n`;

  if (topCommands.length) {
    topCommands.forEach(([cmd, count], i) => {
      message += `${i + 1}. ${cmd}: ${count}x\n`;
    });
  } else {
    message += `_Nenhum comando usado_`;
  }

  await telegramService.sendMessage(chatId, message, {
    reply_markup: telegramService.getMainKeyboard()
  });
}

async function handleSettings(chatId) {
  const user = telegramUsers.get(chatId);
  const linked = user?.login ? `✅ Vinculado (${user.login})` : '❌ Não vinculado';
  const lang = userTranslations.get(chatId) || 'pt';
  const langNames = { pt: 'Português', en: 'English', es: 'Español' };

  const message = `⚙️ *Configurações*\n\n` +
    `👤 Telegram ID: ${chatId}\n` +
    `🔗 Status: ${linked}\n` +
    `🌐 Idioma: ${langNames[lang]}\n\n` +
    `📋 *Comandos:*\n` +
    `/idioma - Trocar idioma\n` +
    `/stats - Estatísticas\n` +
    `/limpar - Limpar histórico`;

  await telegramService.sendMessage(chatId, message, {
    reply_markup: telegramService.getBackKeyboard()
  });
}
// setTimeout(setupTelegramWebhook, 2000);

function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 1000);
}

function validatePropertyData(data) {
  const errors = [];
  
  if (!data.title || typeof data.title !== 'string' || data.title.length < 3) {
    errors.push('Título inválido');
  }
  if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
    errors.push('Preço inválido');
  }
  if (data.images && Array.isArray(data.images)) {
    const totalSize = data.images.reduce((acc, img) => acc + (img?.length || 0), 0);
    if (totalSize > 5 * 1024 * 1024) {
      errors.push('Tamanho total das imagens excede 5MB');
    }
    if (data.images.length > 10) {
      errors.push('Máximo de 10 imagens por imóvel');
    }
  }
  
  return errors;
}

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.error('Telegram bot token not configured');
    return { ok: false };
  }
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4096) })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      logger.error('Telegram API error', { status: response.status, error });
      return { ok: false };
    }
    
    return await response.json();
  } catch (e) {
    logger.error('Failed to send Telegram message', { error: e.message });
    return { ok: false };
  }
}

app.post('/api/auth/register',
  authLimiter,
  body('login').isLength({ min: 3, max: 20 }).trim(),
  body('password').isLength({ min: 6, max: 100 }),
  body('name').isLength({ min: 2, max: 100 }).trim(),
  body('email').isEmail().normalizeEmail(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed', { errors: errors.array() });
        return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
      }

      const { login, password, name, email, phone, telegramId } = req.body;
      const safeLogin = sanitizeInput(login);

      if (users.has(safeLogin)) {
        logger.warn('Registration failed - login exists', { login: safeLogin });
        return res.status(409).json({ error: 'login já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      
      const user = {
        login: safeLogin,
        password: hashedPassword,
        name: sanitizeInput(name),
        email: sanitizeInput(email),
        phone: sanitizeInput(phone || ''),
        telegramId: telegramId ? sanitizeInput(telegramId) : '',
        createdAt: Date.now()
      };

      users.set(safeLogin, user);
      
      logger.info('User registered', { login: safeLogin });
      res.status(201).json({ success: true, login: safeLogin });
    } catch (e) {
      logger.error('Registration error', { error: e.message });
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

app.post('/api/auth/login',
  // authLimiter, // Temporarily disabled for testing
  body('login').notEmpty().trim(),
  body('password').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'login e senha são obrigatórios' });
      }

      const { login, password } = req.body;
      const safeLogin = sanitizeInput(login);
      
      const user = await validateUser(safeLogin, password);

      if (!user) {
        logger.warn('Login failed - user not found or wrong password', { login: safeLogin });
        return res.status(401).json({ error: 'Login ou senha incorretos' });
      }

      const token = Buffer.from(`${user.login}:${Date.now() + 24 * 60 * 60 * 1000}`).toString('base64');
      
      logger.info('Login successful', { login: user.login });
      res.json({ 
        success: true, 
        token,
        user: { login: safeLogin, name: user.name, email: user.email, phone: user.phone, telegramId: user.telegramId }
      });
    } catch (e) {
      logger.error('Login error', { error: e.message });
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    if (update.message) {
      await handleTelegramMessage(update.message);
    }
    
    res.send('OK');
  } catch (e) {
    logger.error('Webhook error', { error: e.message, stack: e.stack });
    res.sendStatus(200);
  }
});

app.get('/api/profile/:login/telegram-id', (req, res) => {
  const user = users.get(req.params.login);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  res.json({ telegramId: user.telegramId || null });
});

app.post('/api/profile/:login/telegram-id',
  body('telegramId').isLength({ min: 1, max: 50 }).trim(),
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Telegram ID inválido', details: errors.array() });
      }
      const user = users.get(req.params.login);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      user.telegramId = sanitizeInput(req.body.telegramId);
      users.set(req.params.login, user);
      logger.info('Telegram ID updated', { login: req.params.login });
      res.json({ success: true, telegramId: user.telegramId });
    } catch (e) {
      logger.error('Telegram ID update error', { error: e.message });
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

app.get('/api/telegram/status', (req, res) => {
  const analytics = telegramService.getAnalytics();
  res.json({ 
    status: 'online', 
    bot_token_configured: !!TELEGRAM_BOT_TOKEN,
    gemini_configured: !!GEMINI_API_KEY,
    analytics
  });
});

app.get('/api/debug-db', async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL ? (process.env.DATABASE_URL.length > 10 ? 'configured (masked)' : 'short/invalid') : 'missing';
    const hasAuthToken = !!process.env.LIBSQL_AUTH_TOKEN;
    const clientExists = !!dataEngine;
    
    let dbOnline = false;
    if (dataEngine) {
      try {
        await dataEngine.getProperties();
        dbOnline = true;
      } catch (e) {
        dbOnline = false;
      }
    }

    res.json({
      dbUrl,
      hasAuthToken,
      clientExists,
      dbOnline,
      env: process.env.NODE_ENV || 'not set'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Rotas disponíveis mesmo sem dataEngine
app.get('/api/leads', async (req, res) => {
  if (!dataEngine) return res.json({ success: true, count: 0, leads: [] });
  try {
    const leads = await dataEngine.getLeads();
    res.json({ success: true, count: leads.length, leads });
  } catch (e) {
    logger.error('Leads fetch error', { error: e.message });
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
});

app.get('/api/properties', async (req, res) => {
  if (!dataEngine) return res.json({ success: true, count: 0, properties: [] });
  try {
    const properties = await dataEngine.getProperties();
    res.json({ success: true, count: properties.length, properties });
  } catch (e) {
    logger.error('Properties fetch error', { error: e.message });
    res.status(500).json({ error: 'Erro ao buscar imóveis' });
  }
});

app.get('/api/appointments', async (req, res) => {
  if (!dataEngine) return res.json({ success: true, count: 0, appointments: [] });
  try {
    const appointments = await dataEngine.getAppointments();
    res.json({ success: true, count: appointments.length, appointments });
  } catch (e) {
    logger.error('Appointments fetch error', { error: e.message });
    res.json({ success: true, count: 0, appointments: [] });
  }
});

app.post('/api/leads', async (req, res) => {
  if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
  try {
    const lead = {
      id: `lead_${Date.now()}`,
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      source: req.body.source || 'Telegram',
      status: req.body.status || 'novo'
    };
    await dataEngine.addLead(lead);
    logger.info('Lead created via API', { leadId: lead.id });
    res.status(201).json({ success: true, lead });
  } catch (e) {
    logger.error('Lead creation error', { error: e.message });
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
});

// Fallback para Partner API se dataEngine não disponível
app.get('/api/partner/properties', async (req, res) => {
  if (!dataEngine) return res.json({ success: true, count: 0, properties: [] });
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

app.post('/api/partner/properties', async (req, res) => {
  if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
  try {
    const property = req.body;
    if (!property.id) property.id = `prop_${Date.now()}`;
    await dataEngine.addProperty(property);
    logger.info('Property created via Partner API', { propertyId: property.id });
    res.status(201).json({ success: true, propertyId: property.id });
  } catch (e) {
    logger.error('Partner property creation error', { error: e.message });
    res.status(500).json({ error: 'Erro ao salvar imóvel' });
  }
});

app.delete('/api/partner/properties', async (req, res) => {
  if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    
    // Deleta campanhas associadas do Instagram antes de remover o imóvel
    const campanhas = await dataEngine.getCampaigns();
    const propsCampanhas = campanhas.filter(c => c.property_id === id);
    for (const camp of propsCampanhas) {
      if (camp.instagram_post_id) {
        await marketingEngine.deletarDoInstagram(camp.instagram_post_id);
      }
      await dataEngine.deleteCampaign(camp.id);
    }
    
    await dataEngine.deleteProperty(id);
    logger.info('Property deleted via API', { propertyId: id });
    res.json({ success: true, deleted: id });
  } catch (e) {
    logger.error('Property deletion error', { error: e.message });
    res.status(500).json({ error: 'Erro ao deletar imóvel' });
  }
});

app.get('/api/partner/property-image', async (req, res) => {
  if (!dataEngine) return res.status(503).json({ error: 'dataEngine não disponível' });
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

app.get('/api/partner/properties/status', async (req, res) => {
  if (!dataEngine) return res.json({ success: true, statuses: {} });
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

app.get('/api/telegram/analytics', (req, res) => {
  res.json(telegramService.getAnalytics());
});

app.get('/api/hermes/status', (req, res) => {
  try {
    const status = hermes.getStatus();
    res.json({ ...status, timestamp: new Date().toISOString() });
  } catch(e) {
    logger.error('Hermes status error', { error: e.message });
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

app.get('/api/partner/register', async (req, res) => {
  try {
    const login = req.query.login;
    if (!login) return res.status(400).json({ error: 'login obrigatório' });

    // Try Database first, fall back to in-memory Map
    let broker = null;
    if (dataEngine) {
      broker = await dataEngine.getBroker(login);
    }
    if (!broker) {
      broker = users.get(login) || null;
    }

    res.json({ success: true, broker });
  } catch (e) {
    logger.error('Get broker error', { error: e.message });
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

app.post('/api/partner/register', async (req, res) => {
  try {
    const broker = req.body;
    if (!broker.login) return res.status(400).json({ error: 'login obrigatório' });

    // Persist to Database (primary) and in-memory Map (fallback)
    if (dataEngine) {
      await dataEngine.saveBroker(broker);
    }
    users.set(broker.login, { ...broker, updatedAt: Date.now() });

    logger.info('Broker profile saved', { login: broker.login, hasPhoto: !!broker.photo });
    res.json({ success: true });
  } catch (e) {
    logger.error('Save broker error', { error: e.message });
    res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});


app.get('/api/health', (req, res) => {
  res.json({ 
    app: 'IAmobil Gestor',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETING ENGINE ROUTES (must be before catch-all)
// ═══════════════════════════════════════════════════════════════════════════════

const marketingEngine = new MarketingEngine();

app.post('/api/marketing/criar-campanha', async (req, res) => {
  try {
    const { propertyId, budget, campaignDays, includeOrganic, includeAds } = req.body;
    
    if (!propertyId) {
      return res.status(400).json({ success: false, error: 'propertyId é obrigatório' });
    }

    logger.info('Solicitação de campanha recebida', { propertyId, budget, campaignDays, includeOrganic, includeAds });

    const result = await marketingEngine.criarCampanha(propertyId, {
      budget: budget || 20,
      campaignDays: campaignDays || 14,
      includeOrganic: includeOrganic !== false,
      includeAds: includeAds !== false
    });

    res.json(result);
  } catch (e) {
    logger.error('Erro na rota de marketing', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/marketing/status/:propertyId', async (req, res) => {
  try {
    const status = marketingEngine.getCampaignStatus(req.params.propertyId);
    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/marketing/status', (req, res) => {
  try {
    const status = marketingEngine.getStatus();
    res.json({ success: true, ...status, propertyId: null });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/marketing/campanhas', (req, res) => {
  try {
    const campanhas = marketingEngine.listActiveCampaigns();
    res.json({ success: true, count: campanhas.length, campanhas });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════

// Lista todas as campanhas (do banco de dados)
app.get('/api/campaigns/list', async (req, res) => {
  try {
    const campanhas = await marketingEngine.listAllCampaigns();
    res.json({ success: true, count: campanhas.length, campanhas });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Estatísticas de campanhas
app.get('/api/campaigns/stats', async (req, res) => {
  try {
    const stats = await marketingEngine.getCampaignStats();
    res.json({ success: true, stats });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Deleta uma campanha (opcionalmente remove o post do Instagram)
app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    if (!dataEngine) return res.status(503).json({ success: false, error: 'dataEngine não disponível' });
    
    // Busca campanha antes de deletar para pegar o post ID
    const campanhas = await dataEngine.getCampaigns();
    const campanha = campanhas.find(c => c.id === req.params.id);
    
    // Deleta do banco
    const ok = await dataEngine.deleteCampaign(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Campanha não encontrada' });
    
    // Se tem post no Instagram, tenta deletar de lá também
    let instagramResult = null;
    if (campanha?.instagram_post_id) {
      instagramResult = await marketingEngine.deletarDoInstagram(campanha.instagram_post_id);
    }
    
    res.json({ success: true, instagram: instagramResult });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Serve imagem de um imóvel por índice (para Instagram/Facebook)
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

app.use('/public', express.static(path.join(__dirname, '../public')));

app.get('/privacidade', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Política de Privacidade - IAmobil</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}h1{color:#2563eb}</style></head><body><h1>Política de Privacidade</h1><p>O IAmobil respeita a privacidade dos seus usuários. Coletamos apenas dados necessários para o funcionamento da plataforma, como nome, e-mail e telefone, utilizados exclusivamente para conectar corretores e clientes.</p><p>Não compartilhamos seus dados com terceiros sem autorização. Você pode solicitar a exclusão dos seus dados a qualquer momento através da página de exclusão.</p><p>Última atualização: Junho 2026</p></body></html>`);
});

app.get('/excluir-dados', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Exclusão de Dados - IAmobil</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}h1{color:#2563eb}</style></head><body><h1>Exclusão de Dados</h1><p>Para solicitar a exclusão dos seus dados do IAmobil, envie um e-mail para <strong>edycarlosdias@hotmail.com</strong> com o assunto "Exclusão de Dados" informando seu nome e e-mail cadastrado.</p><p>Processaremos sua solicitação em até 30 dias.</p></body></html>`);
});

app.get('/termos', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Termos de Serviço - IAmobil</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}h1{color:#2563eb}</style></head><body><h1>Termos de Serviço</h1><p>Ao utilizar o IAmobil, você concorda com os seguintes termos: o IAmobil é uma plataforma que conecta corretores de imóveis a potenciais compradores. Não nos responsabilizamos por negociações realizadas entre as partes. Os dados fornecidos serão usados exclusivamente para o funcionamento da plataforma.</p><p>O usuário concorda em não utilizar a plataforma para fins ilícitos. Reservamo-nos o direito de modificar estes termos a qualquer momento, com aviso prévio.</p><p>Contato: edycarlosdias@hotmail.com</p><p>Última atualização: Junho 2026</p></body></html>`);
});

// ═══════════════════════════════════════════════════════════════════════════════

// Public property page - no auth required
app.get('/api/property/:id/public', async (req, res) => {
  try {
    if (!dataEngine) return res.status(503).json({ error: 'Serviço indisponível' });
    const property = await dataEngine.getPropertyById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Imóvel não encontrado' });

    const broker = await dataEngine.getBroker(property.brokerCreci || '');

    res.json({
      success: true,
      property: {
        id: property.id,
        title: property.title,
        type: property.type,
        price: property.price,
        description: property.description,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        suites: property.suites,
        parkingSpaces: property.parkingSpaces,
        size: property.size,
        sizeUnit: property.sizeUnit,
        city: property.city,
        neighborhood: property.neighborhood,
        state: property.state,
        address: property.address,
        images: property.images,
        status: property.status
      },
      broker: broker ? {
        name: broker.name,
        phone: broker.phone,
        photo: broker.photo,
        creci: broker.creci
      } : null
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar imóvel' });
  }
});

// Public property SPA route
app.get('/imovel/:id', (req, res) => {
  const publicHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Imóvel - IAmobil</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { colors: { orange: { 500: '#f97316', 600: '#ea580c' } } } } };
  </script>
</head>
<body class="bg-gray-950 text-white">
  <div id="root" class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-sm text-gray-500 font-bold uppercase tracking-widest">Carregando imóvel...</p>
    </div>
  </div>
  <script>
    (async () => {
      const id = window.location.pathname.split('/').pop();
      try {
        const res = await fetch('/api/property/' + id + '/public');
        const data = await res.json();
        if (!data.success || !data.property) {
          document.getElementById('root').innerHTML = 
            '<div class="text-center py-20"><h1 class="text-2xl font-black text-gray-600 mb-2">Imóvel não encontrado</h1>' +
            '<p class="text-sm text-gray-500">O link pode estar incorreto ou o imóvel foi removido.</p></div>';
          return;
        }
        const p = data.property;
        const b = data.broker;
        const formatPrice = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR');
        const imgs = Array.isArray(p.images) ? p.images : [];
        
        let imgHtml = '';
        if (imgs.length > 0) {
          const firstImg = imgs[0].startsWith('data:') ? imgs[0] : imgs[0];
          imgHtml = '<img src="' + firstImg + '" class="w-full h-64 md:h-96 object-cover rounded-2xl mb-6" />';
          if (imgs.length > 1) {
            imgHtml += '<div class="flex gap-2 overflow-x-auto pb-2 mb-6">';
            for (let i = 0; i < imgs.length; i++) {
              imgHtml += '<img src="' + imgs[i] + '" class="w-24 h-20 object-cover rounded-xl shrink-0 border border-white/10" />';
            }
            imgHtml += '</div>';
          }
        }

        let brokerHtml = '';
        if (b) {
          const photoHtml = b.photo && b.photo.startsWith('data:') 
            ? '<img src="' + b.photo + '" class="w-12 h-12 rounded-full object-cover" />'
            : '<div class="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center text-lg font-bold text-white">' + (b.name ? b.name.charAt(0).toUpperCase() : 'C') + '</div>';
          brokerHtml = 
            '<div class="bg-zinc-900 rounded-2xl p-5 border border-white/5 mt-6 flex items-center gap-4">' +
            photoHtml +
            '<div class="flex-1"><p class="font-bold text-sm">' + (b.name || 'Corretor') + '</p>' +
            '<p class="text-xs text-gray-500">CRECI: ' + (b.creci || '') + '</p></div>' +
            (b.phone ? '<a href="https://wa.me/55' + b.phone.replace(/\\D/g, '') + '" target="_blank" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-all">WhatsApp</a>' : '') +
            '</div>';
        }

        document.getElementById('root').innerHTML =
          '<div class="max-w-2xl mx-auto p-4 md:p-8">' +
          imgHtml +
          '<div class="flex items-center gap-2 mb-2"><span class="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold">' + (p.type || 'Imóvel') + '</span>' +
          '<span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">' + (p.status || 'Disponível') + '</span></div>' +
          '<h1 class="text-2xl font-black text-white mb-1">' + (p.title || '') + '</h1>' +
          '<p class="text-3xl font-black text-orange-500 mb-4">' + formatPrice(p.price) + '</p>' +
          (p.description ? '<p class="text-sm text-gray-400 mb-6">' + p.description + '</p>' : '') +
          '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">' +
          '<div class="bg-zinc-900 rounded-xl p-3 text-center border border-white/5"><p class="text-lg font-bold">' + (p.size || 0) + '</p><p class="text-xs text-gray-500">' + (p.sizeUnit || 'm²') + '</p></div>' +
          '<div class="bg-zinc-900 rounded-xl p-3 text-center border border-white/5"><p class="text-lg font-bold">' + (p.bedrooms || 0) + '</p><p class="text-xs text-gray-500">Dorm</p></div>' +
          '<div class="bg-zinc-900 rounded-xl p-3 text-center border border-white/5"><p class="text-lg font-bold">' + (p.suites || 0) + '</p><p class="text-xs text-gray-500">Suítes</p></div>' +
          '<div class="bg-zinc-900 rounded-xl p-3 text-center border border-white/5"><p class="text-lg font-bold">' + (p.bathrooms || 0) + '</p><p class="text-xs text-gray-500">Ban</p></div>' +
          '</div>' +
          (p.city || p.neighborhood ? '<div class="text-sm text-gray-400 mb-6"><span class="text-gray-600">📍</span> ' + (p.neighborhood || '') + (p.neighborhood && p.city ? ', ' : '') + (p.city || '') + ' - ' + (p.state || '') + '</div>' : '') +
          brokerHtml +
          '</div>';
      } catch(e) {
        document.getElementById('root').innerHTML = 
          '<div class="text-center py-20"><h1 class="text-2xl font-black text-gray-600 mb-2">Erro ao carregar</h1>' +
          '<p class="text-sm text-gray-500">Tente novamente mais tarde.</p></div>';
      }
    })();
  </script>
</body>
</html>`;
  res.send(publicHtml);
});

// Export all properties as JSON
app.get('/api/properties/export', async (req, res) => {
  try {
    if (!dataEngine) return res.status(503).json({ error: 'Serviço indisponível' });
    const properties = await dataEngine.getProperties();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=iamobil-backup-' + Date.now() + '.json');
    res.json({ exportedAt: new Date().toISOString(), count: properties.length, properties });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao exportar' });
  }
});

// Export as CSV
app.get('/api/properties/export/csv', async (req, res) => {
  try {
    if (!dataEngine) return res.status(503).json({ error: 'Serviço indisponível' });
    const properties = await dataEngine.getProperties();
    const header = 'id,title,type,price,city,neighborhood,bedrooms,bathrooms,parkingSpaces,size,sizeUnit,status';
    const rows = properties.map(p => 
      [p.id, p.title, p.type, p.price, p.city, p.neighborhood, p.bedrooms, p.bathrooms, p.parkingSpaces, p.size, p.sizeUnit, p.status]
        .map(v => String(v || '').replace(/,/g, ' ')).join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=iamobil-backup-' + Date.now() + '.csv');
    res.send([header, ...rows].join('\n'));
  } catch (e) {
    res.status(500).json({ error: 'Erro ao exportar' });
  }
});

// Upload image to Imgur (ou armazena base64 como fallback)
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

app.post('/api/properties/upload-image', async (req, res) => {
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
        console.warn('[Upload] Imgur failed, falling back to base64');
      }
    }

    if (url) {
      res.json({ success: true, url, storage: 'imgur' });
    } else {
      res.json({ success: true, url: image, storage: 'base64' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
  }
});

// Push notification subscription
let pushSubscriptions = [];

app.post('/api/notifications/subscribe', (req, res) => {
  try {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Subscription inválida' });
    pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
    pushSubscriptions.push(sub);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao inscrever' });
  }
});

app.post('/api/notifications/test', async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title) return res.status(400).json({ error: 'Título obrigatório' });
    
    const results = [];
    for (const sub of pushSubscriptions) {
      try {
        results.push({ endpoint: sub.endpoint?.substring(0, 30) + '...', sent: true });
      } catch (e) {
        results.push({ endpoint: sub.endpoint?.substring(0, 30) + '...', sent: false, error: e.message });
      }
    }
    res.json({ success: true, sent: results.length, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  const errorMessage = err.message || 'Erro interno do servidor';
  res.status(500).json({ 
    error: errorMessage,
    success: false 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📢 Marketing Engine: ${marketingEngine.getStatus().metaAdsConfigured ? '✅ Meta Ads configurado' : '⏸️ Meta Ads aguardando token'}`);
});



