// server/services/telegram.service.cjs
// Serviço do bot Telegram

const path = require('path');
const logger = require(path.join(__dirname, '..', 'utils', 'logger.cjs'));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

class TelegramService {
  constructor(dataEngine, aiService) {
    this.dataEngine = dataEngine;
    this.aiService = aiService;
    this.conversations = new Map();
  }

  async sendMessage(chatId, text, options = {}) {
    if (!TELEGRAM_BOT_TOKEN) return { ok: false };
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: chatId, 
            text: String(text).slice(0, 4096), 
            ...options 
          })
        }
      );
      return await response.json();
    } catch (e) {
      logger.error('Telegram sendMessage error', { error: e.message });
      return { ok: false };
    }
  }

  async sendPhoto(chatId, photo, caption, options = {}) {
    if (!TELEGRAM_BOT_TOKEN) return { ok: false };
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: chatId, 
            photo, 
            caption: String(caption).slice(0, 1024), 
            ...options 
          })
        }
      );
      return await response.json();
    } catch (e) {
      logger.error('Telegram sendPhoto error', { error: e.message });
      return { ok: false };
    }
  }

  clearConversation(chatId) {
    this.conversations.delete(chatId);
  }

  addToConversation(chatId, role, content) {
    if (!this.conversations.has(chatId)) {
      this.conversations.set(chatId, []);
    }
    this.conversations.get(chatId).push({ role, content });
  }

  getConversationHistory(chatId) {
    return this.conversations.get(chatId) || [];
  }

  async sendWelcomeMessage(chatId, username) {
    return this.sendMessage(chatId, `Bem-vindo ao IAmobil Gestor, ${username}!`);
  }

  async sendHelpMessage(chatId) {
    const helpText = `Comandos disponíveis:
/start - Iniciar
/imoveis - Ver imóveis
/leads - Ver leads
/agenda - Ver agendamentos
/dashboard - Dashboard
/ajuda - Esta mensagem`;
    return this.sendMessage(chatId, helpText);
  }

  getMainKeyboard() {
    return {
      keyboard: [
        ['🏠 Meus Imóveis', '👥 Meus Leads'],
        ['📅 Agendamentos', '📊 Dashboard']
      ],
      resize_keyboard: true
    };
  }

  getBackKeyboard() {
    return {
      keyboard: [['🔙 Menu Principal']],
      resize_keyboard: true
    };
  }

  async handleCommand(chatId, command, username, login = null) {
    logger.info('Telegram command received', { chatId, command, username });

    switch (command) {
      case '/start':
        if (login) {
          await this.dataEngine.saveTelegramUser(chatId, username, login);
        } else {
          await this.dataEngine.saveTelegramUser(chatId, username);
        }
        await this.sendWelcomeMessage(chatId, username);
        await this.sendMessage(chatId, 'Use os botões abaixo ou digite um comando:', this.getMainKeyboard());
        break;

      case '/imoveis':
        const properties = await this.dataEngine.getProperties();
        if (properties.length === 0) {
          await this.sendMessage(chatId, 'Nenhum imóvel encontrado.');
        } else {
          const list = properties.slice(0, 5).map((p, i) => 
            `${i + 1}. ${p.title} - R$ ${p.price?.toLocaleString('pt-BR')}`
          ).join('\n');
          await this.sendMessage(chatId, `📋 Imóveis disponíveis:\n\n${list}`);
        }
        break;

      case '/leads':
        await this.sendMessage(chatId, '📊 Funcionalidade de leads em desenvolvimento.');
        break;

      case '/agenda':
        await this.sendMessage(chatId, '📅 Funcionalidade de agendamentos em desenvolvimento.');
        break;

      case '/dashboard':
        await this.sendMessage(chatId, '📊 Acesse o painel web para ver o dashboard completo.');
        break;

      case '/ajuda':
        await this.sendHelpMessage(chatId);
        break;

      default:
        // Processar com IA
        if (this.aiService) {
          const response = await this.aiService.process(command);
          await this.sendMessage(chatId, response);
        } else {
          await this.sendMessage(chatId, 'Comando não reconhecido. Use /ajuda para ver os comandos disponíveis.');
        }
    }
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;
    const username = message.from?.username || message.from?.first_name || 'Usuário';

    if (text?.startsWith('/')) {
      await this.handleCommand(chatId, text, username);
    } else {
      // Mensagem de texto normal - processar com IA
      this.addToConversation(chatId, 'user', text);
      
      if (this.aiService) {
        const response = await this.aiService.process(text);
        this.addToConversation(chatId, 'assistant', response);
        await this.sendMessage(chatId, response);
      }
    }
  }

  trackAnalytics(command) {
    // Stub - analytics não implementado
  }

  getAnalytics() {
    return {
      messagesReceived: 0,
      messagesSent: 0,
      activeConversations: this.conversations.size,
      uptime: process.uptime()
    };
  }
}

module.exports = TelegramService;
