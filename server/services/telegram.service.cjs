const path = require('path');
const logger = require(path.join(__dirname, '..', 'utils', 'logger.cjs'));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const translations = {
  pt: {
    start: 'Iniciar conversa', help: 'Central de Ajuda', properties: 'Seus Imóveis',
    leads: 'Seus Leads', appointments: 'Seus Agendamentos', dashboard: 'Resumo Geral',
    settings: 'Configurações', welcome: 'Bem-vindo ao IAmobil Gestor!'
  },
  en: {
    start: 'Start conversation', help: 'Help Center', properties: 'Your Properties',
    leads: 'Your Leads', appointments: 'Your Appointments', dashboard: 'General Summary',
    settings: 'Settings', welcome: 'Welcome to IAmobil Gestor!'
  },
  es: {
    start: 'Iniciar conversación', help: 'Centro de Ayuda', properties: 'Tus Inmuebles',
    leads: 'Tus Leads', appointments: 'Tus Citas', dashboard: 'Resumen General',
    settings: 'Configuración', welcome: '¡Bienvenido a IAmobil Gestor!'
  }
};

class TelegramService {
  constructor(dataEngine, aiService) {
    this.dataEngine = dataEngine;
    this.aiService = aiService;
    this.conversations = new Map();
    this.rateLimitTracker = new Map();
    this.userLanguages = new Map();
    this.pollingOffset = 0;
    this.pollingInterval = null;
    this.pollingActive = true;
    this.stats = { messagesReceived: 0, messagesSent: 0, commandsUsed: {} };
  }

  async sendMessage(chatId, text, options = {}) {
    if (!TELEGRAM_BOT_TOKEN) return { ok: false };
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4096), parse_mode: 'Markdown', ...options })
        }
      );
      const result = await response.json();
      if (result.ok) this.stats.messagesSent++;
      return result;
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
            chat_id: chatId, photo, caption: String(caption).slice(0, 1024), parse_mode: 'Markdown', ...options
          })
        }
      );
      return await response.json();
    } catch (e) {
      logger.error('Telegram sendPhoto error', { error: e.message });
      return { ok: false };
    }
  }

  clearConversation(chatId) { this.conversations.delete(chatId); }

  addToConversation(chatId, role, content) {
    if (!this.conversations.has(chatId)) this.conversations.set(chatId, []);
    this.conversations.get(chatId).push({ role, content });
  }

  getConversationHistory(chatId) { return this.conversations.get(chatId) || []; }

  checkRateLimit(chatId) {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxMessages = 30;
    if (!this.rateLimitTracker.has(chatId)) {
      this.rateLimitTracker.set(chatId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    const tracker = this.rateLimitTracker.get(chatId);
    if (now > tracker.resetAt) {
      this.rateLimitTracker.set(chatId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (tracker.count >= maxMessages) return false;
    tracker.count++;
    return true;
  }

  sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim().slice(0, 1000);
  }

  getMainKeyboard() {
    return {
      keyboard: [
        ['🏠 Meus Imóveis', '👥 Meus Leads'],
        ['📅 Agendamentos', '📊 Dashboard'],
        ['❓ Ajuda', '⚙️ Configurações']
      ],
      resize_keyboard: true
    };
  }

  getBackKeyboard() {
    return { keyboard: [['🔙 Menu Principal']], resize_keyboard: true };
  }

  async sendWelcomeMessage(chatId, username) {
    return this.sendMessage(chatId, `🎉 *Bem-vindo ao IAmobil Gestor, ${username}!*\n\nGerencie seus imóveis, leads e agendamentos diretamente pelo Telegram.`);
  }

  async sendHelpMessage(chatId) {
    const helpText = `*🤖 Comandos Disponíveis*\n\n` +
      `/start - Iniciar o bot\n` +
      `/imoveis - Listar seus imóveis\n` +
      `/leads - Ver seus leads\n` +
      `/agenda - Ver agendamentos\n` +
      `/buscar [termo] - Buscar imóveis\n` +
      `/dashboard - Resumo geral\n` +
      `/stats - Estatísticas do bot\n` +
      `/idioma - Trocar idioma\n` +
      `/id - Seu ID do Telegram\n` +
      `/limpar - Limpar histórico\n` +
      `/ajuda - Esta mensagem`;
    return this.sendMessage(chatId, helpText);
  }

  async handleStart(chatId, username) {
    this.clearConversation(chatId);
    this.rateLimitTracker.delete(chatId);
    if (this.dataEngine) {
      await this.dataEngine.saveTelegramUser(chatId, username);
    }
    await this.sendWelcomeMessage(chatId, username);
    await this.sendMessage(chatId, 'Use os botões abaixo ou digite um comando:', this.getMainKeyboard());
  }

  async handleListProperties(chatId, login) {
    if (!this.dataEngine) {
      return this.sendMessage(chatId, '📭 Sistema indisponível.', { reply_markup: this.getBackKeyboard() });
    }
    try {
      const allProperties = await this.dataEngine.getProperties();
      const properties = login
        ? allProperties.filter(p =>
            (p.brokerLogin || '').toLowerCase() === login.toLowerCase() ||
            (p.broker_creci || '').toLowerCase() === login.toLowerCase()
          )
        : allProperties;
      if (!properties.length) {
        return this.sendMessage(chatId, '📭 Nenhum imóvel cadastrado.', { reply_markup: this.getBackKeyboard() });
      }
      let message = `🏠 *Seus Imóveis* (${properties.length})\n\n`;
      properties.slice(0, 5).forEach((p, i) => {
        const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0);
        message += `${i + 1}. *${p.title}*\n   💰 ${price} | 📍 ${p.city || p.address || 'N/I'}\n   📌 ${p.status || 'Disponível'}\n\n`;
      });
      if (properties.length > 5) message += `_Mostrando 5 de ${properties.length}._ Use /buscar para filtrar.\n\n`;
      await this.sendMessage(chatId, message, { reply_markup: this.getBackKeyboard() });
      if (properties[0]?.images?.length) {
        await this.sendPhoto(chatId, properties[0].images[0], `📷 ${properties[0].title}`);
      }
    } catch (e) {
      logger.error('Telegram list properties error', { error: e.message });
      await this.sendMessage(chatId, '❌ Erro ao buscar imóveis.', { reply_markup: this.getBackKeyboard() });
    }
  }

  async handleListLeads(chatId) {
    if (!this.dataEngine) {
      return this.sendMessage(chatId, '📭 Sistema indisponível.', { reply_markup: this.getBackKeyboard() });
    }
    try {
      const leads = await this.dataEngine.getLeads();
      if (!leads.length) {
        return this.sendMessage(chatId, '📭 Nenhum lead encontrado.', { reply_markup: this.getBackKeyboard() });
      }
      const statusEmoji = { quente: '🔥', morno: '🌡️', frio: '❄️', novo: '🆕', convertido: '✅', hot: '🔥', warm: '🌡️', cold: '❄️', new: '🆕' };
      let message = `👥 *Seus Leads* (${leads.length})\n\n`;
      leads.slice(0, 5).forEach((l, i) => {
        message += `${i + 1}. *${l.name}*\n   📞 ${l.phone || l.contact || 'N/I'}\n   🎯 ${l.notes || 'Interesse geral'}\n   ${statusEmoji[l.status] || '📌'} Score: ${l.score || 0}\n\n`;
      });
      if (leads.length > 5) message += `_Mostrando 5 de ${leads.length}_`;
      await this.sendMessage(chatId, message, { reply_markup: this.getBackKeyboard() });
    } catch (e) {
      logger.error('Telegram list leads error', { error: e.message });
      await this.sendMessage(chatId, '❌ Erro ao buscar leads.', { reply_markup: this.getBackKeyboard() });
    }
  }

  async handleListAppointments(chatId) {
    if (!this.dataEngine) {
      return this.sendMessage(chatId, '📭 Sistema indisponível.', { reply_markup: this.getBackKeyboard() });
    }
    try {
      const appointments = await this.dataEngine.getAppointments();
      if (!appointments.length) {
        return this.sendMessage(chatId, '📭 Nenhum agendamento.', { reply_markup: this.getBackKeyboard() });
      }
      let message = `📅 *Seus Agendamentos* (${appointments.length})\n\n`;
      appointments.slice(0, 5).forEach((a, i) => {
        message += `${i + 1}. *${a.lead_name || a.lead_id || 'Cliente'}*\n`;
        message += `   🏠 ${a.property_title || a.property_id || 'Imóvel'}\n`;
        message += `   📆 ${a.date_time || a.date || 'Data não definida'}\n`;
        message += `   📌 ${a.status || 'Pendente'}\n\n`;
      });
      if (appointments.length > 5) message += `_Mostrando 5 de ${appointments.length}_`;
      await this.sendMessage(chatId, message, { reply_markup: this.getBackKeyboard() });
    } catch (e) {
      logger.error('Telegram list appointments error', { error: e.message });
      await this.sendMessage(chatId, '❌ Erro ao buscar agendamentos.', { reply_markup: this.getBackKeyboard() });
    }
  }

  async handleDashboard(chatId) {
    let propertiesCount = 0, leadsCount = 0, appointmentsCount = 0, hotLeads = 0;
    if (this.dataEngine) {
      try {
        const [properties, leads, appointments] = await Promise.all([
          this.dataEngine.getProperties().catch(() => []),
          this.dataEngine.getLeads().catch(() => []),
          this.dataEngine.getAppointments().catch(() => [])
        ]);
        propertiesCount = properties.length;
        leadsCount = leads.length;
        appointmentsCount = appointments.length;
        hotLeads = leads.filter(l => (l.status || '').toLowerCase() === 'quente' || l.status === 'hot').length;
      } catch (e) { logger.warn('Dashboard partial error', { error: e.message }); }
    }
    const uptimeHours = Math.floor(process.uptime() / 3600);
    const uptimeMinutes = Math.floor((process.uptime() % 3600) / 60);
    const message = `📊 *Dashboard IAmobil*\n\n` +
      `🏠 Imóveis: ${propertiesCount}\n` +
      `👥 Leads: ${leadsCount} (🔥 ${hotLeads} quentes)\n` +
      `📅 Agendamentos: ${appointmentsCount}\n\n` +
      `*Bot:*\n💬 Recebidas: ${this.stats.messagesReceived}\n` +
      `📤 Enviadas: ${this.stats.messagesSent}\n` +
      `⏱️ Uptime: ${uptimeHours}h ${uptimeMinutes}m`;
    await this.sendMessage(chatId, message, { reply_markup: this.getMainKeyboard() });
  }

  async handleSearch(chatId, query) {
    if (!this.dataEngine) {
      return this.sendMessage(chatId, '📭 Busca indisponível.', { reply_markup: this.getBackKeyboard() });
    }
    try {
      const properties = await this.dataEngine.getProperties();
      const terms = query.toLowerCase().split(' ');
      const results = properties.filter(p => {
        const searchable = `${p.title || ''} ${p.address || ''} ${p.city || ''} ${p.type || ''} ${p.neighborhood || ''}`.toLowerCase();
        return terms.some(term => searchable.includes(term)) ||
               (p.price && terms.some(term => !isNaN(term) && p.price <= parseFloat(term)));
      });
      if (!results.length) {
        return this.sendMessage(chatId, `🔍 Nenhum resultado para "${query}"`, { reply_markup: this.getBackKeyboard() });
      }
      let message = `🔍 *Resultados para "${query}"* (${results.length})\n\n`;
      results.slice(0, 5).forEach((p, i) => {
        const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0);
        message += `${i + 1}. *${p.title}*\n   ${price} | 📍 ${p.city || p.address || 'N/I'}\n\n`;
      });
      if (results.length > 5) message += `_Mostrando 5 de ${results.length}_`;
      await this.sendMessage(chatId, message, { reply_markup: this.getBackKeyboard() });
    } catch (e) {
      logger.error('Search error', { error: e.message });
      await this.sendMessage(chatId, '❌ Erro na busca.', { reply_markup: this.getBackKeyboard() });
    }
  }

  async handleSettings(chatId) {
    const userLang = this.userLanguages.get(chatId) || 'pt';
    const langNames = { pt: 'Português', en: 'English', es: 'Español' };
    let linked = '❌ Não vinculado';
    if (this.dataEngine) {
      try {
        const user = await this.dataEngine.getTelegramUser(chatId);
        if (user?.login) linked = `✅ Vinculado (${user.login})`;
      } catch (e) {}
    }
    const message = `⚙️ *Configurações*\n\n` +
      `👤 Telegram ID: \`${chatId}\`\n` +
      `🔗 Conta IAmobil: ${linked}\n` +
      `🌐 Idioma: ${langNames[userLang]}\n\n` +
      `*Comandos:*\n` +
      `/idioma - Trocar idioma\n` +
      `/stats - Estatísticas\n` +
      `/limpar - Limpar histórico`;
    await this.sendMessage(chatId, message, { reply_markup: this.getBackKeyboard() });
  }

  async handleStats(chatId) {
    const topCommands = Object.entries(this.stats.commandsUsed)
      .sort((a, b) => b[1] - a[1]).slice(0, 5);
    let message = `📈 *Estatísticas do Bot*\n\n` +
      `💬 Total recebidas: ${this.stats.messagesReceived}\n` +
      `📤 Total enviadas: ${this.stats.messagesSent}\n\n` +
      `*Comandos mais usados:*\n`;
    if (topCommands.length) {
      topCommands.forEach(([cmd, count], i) => { message += `${i + 1}. \`${cmd}\`: ${count}x\n`; });
    } else {
      message += `_Nenhum comando ainda_`;
    }
    await this.sendMessage(chatId, message, { reply_markup: this.getMainKeyboard() });
  }

  async handleCommand(chatId, text, username) {
    this.stats.messagesReceived++;
    const cmdName = text.split(' ')[0];
    this.stats.commandsUsed[cmdName] = (this.stats.commandsUsed[cmdName] || 0) + 1;
    logger.info('Telegram command', { chatId, command: cmdName, username });

    let login = null;
    if (this.dataEngine) {
      try {
        const user = await this.dataEngine.getTelegramUser(chatId);
        if (user) login = user.login;
      } catch (e) {}
    }

    const commands = {
      '/start': () => this.handleStart(chatId, username),
      '/ajuda': () => this.sendHelpMessage(chatId),
      '/help': () => this.sendHelpMessage(chatId),
      '/limpar': () => { this.clearConversation(chatId); return this.sendMessage(chatId, '🗑️ Histórico limpo!', { reply_markup: this.getMainKeyboard() }); },
      '/imoveis': () => this.handleListProperties(chatId, login),
      '/leads': () => this.handleListLeads(chatId),
      '/agenda': () => this.handleListAppointments(chatId),
      '/dashboard': () => this.handleDashboard(chatId),
      '/id': () => this.sendMessage(chatId, `🆔 Seu ID do Telegram é:\n\n\`${chatId}\`\n\nUse este ID no seu perfil do IAmobil para vincular sua conta.`),
      '/stats': () => this.handleStats(chatId),
      '/idioma': () => {
        const currentLang = this.userLanguages.get(chatId) || 'pt';
        const nextLang = currentLang === 'pt' ? 'en' : currentLang === 'en' ? 'es' : 'pt';
        this.userLanguages.set(chatId, nextLang);
        const langNames = { pt: 'Português', en: 'English', es: 'Español' };
        return this.sendMessage(chatId, `🌐 Idioma alterado para ${langNames[nextLang]}`, { reply_markup: this.getMainKeyboard() });
      },
      '/config': () => this.handleSettings(chatId),
      '🏠 Meus Imóveis': () => this.handleListProperties(chatId, login),
      '👥 Meus Leads': () => this.handleListLeads(chatId),
      '📅 Agendamentos': () => this.handleListAppointments(chatId),
      '📊 Dashboard': () => this.handleDashboard(chatId),
      '❓ Ajuda': () => this.sendHelpMessage(chatId),
      '⚙️ Configurações': () => this.handleSettings(chatId),
      '🔙 Menu Principal': () => this.sendMessage(chatId, '📋 *Menu Principal*', { reply_markup: this.getMainKeyboard() }),
    };

    if (text.startsWith('/buscar ')) {
      return this.handleSearch(chatId, text.replace('/buscar ', ''));
    }

    if (commands[text]) {
      return commands[text]();
    }

    this.addToConversation(chatId, 'user', text);
    if (this.aiService) {
      try {
        const history = this.getConversationHistory(chatId);
        const contextMsg = history.length > 1
          ? `Histórico:\n${history.slice(-6, -1).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUsuário: ${text}`
          : text;
        const response = await this.aiService.process(contextMsg);
        this.addToConversation(chatId, 'assistant', response);
        await this.sendMessage(chatId, response, { reply_markup: this.getMainKeyboard() });
      } catch (e) {
        logger.error('AI response error', { error: e.message });
        await this.sendMessage(chatId, '❌ Erro ao processar. Tente novamente.', { reply_markup: this.getMainKeyboard() });
      }
    } else {
      await this.sendMessage(chatId, '🤖 IA não configurada. Use /ajuda para comandos.', { reply_markup: this.getMainKeyboard() });
    }
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    let text = message.text || '';
    const username = message.from?.username || message.from?.first_name || 'Usuário';

    text = this.sanitizeInput(text);
    if (!text) return;

    if (!this.checkRateLimit(chatId)) {
      return this.sendMessage(chatId, '⏳ Muitas mensagens. Aguarde um momento.');
    }

    await this.handleCommand(chatId, text, username);
  }

  async setupWebhook(webhookUrl) {
    if (!TELEGRAM_BOT_TOKEN) { logger.warn('TELEGRAM_BOT_TOKEN not configured'); return; }
    if (webhookUrl) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: webhookUrl }) }
        );
        const result = await response.json();
        logger.info('Telegram webhook configured', { ok: result.ok, description: result.description });
      } catch (e) {
        logger.error('Failed to configure Telegram webhook', { error: e.message });
        logger.info('Starting polling fallback');
        this.startPolling();
      }
    } else {
      logger.info('No webhook URL configured, starting polling mode');
      this.startPolling();
    }
  }

  startPolling() {
    const poll = async () => {
      if (!this.pollingActive) return;
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${this.pollingOffset}&timeout=10`,
          { method: 'GET' }
        );
        if (!response.ok) { setTimeout(poll, 5000); return; }
        const data = await response.json();
        if (!data.ok || !data.result?.length) { this.pollingActive = true; return; }
        for (const update of data.result) {
          this.pollingOffset = update.update_id + 1;
          if (update.message) await this.handleMessage(update.message);
        }
        this.pollingActive = true;
      } catch (e) {
        logger.error('Polling error', { error: e.message });
        await new Promise(r => setTimeout(r, 5000));
      }
    };
    this.pollingInterval = setInterval(poll, 2000);
    poll();
  }

  stopPolling() {
    this.pollingActive = false;
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  trackAnalytics(command) {
    this.stats.commandsUsed[command] = (this.stats.commandsUsed[command] || 0) + 1;
  }

  getAnalytics() {
    return {
      messagesReceived: this.stats.messagesReceived,
      messagesSent: this.stats.messagesSent,
      activeConversations: this.conversations.size,
      commandsUsed: this.stats.commandsUsed,
      uptime: process.uptime()
    };
  }
}

module.exports = TelegramService;
