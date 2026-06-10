# Shard 3: Services Layer

> **Source:** fullstack-architecture.md §4, §5.3  
> **For:** @sm, @dev

---

## Problema Atual

- `server/index.cjs` contém toda a lógica de negócio inline (~1614 linhas)
- Telegram bot inline (~250 linhas)
- AI gateway com 3 implementações separadas
- Marketing engine com DataEngine próprio

## Solução

### Services Extraídos

```
server/services/
├── auth.service.cjs        # Login, registro, JWT
├── property.service.cjs    # CRUD imóveis
├── lead.service.cjs        # CRUD leads
├── appointment.service.cjs # Agendamentos
├── marketing.service.cjs   # Meta Ads + Instagram
├── telegram.service.cjs    # Bot Telegram
└── ai.service.cjs          # Gemini/Groq/Mistral
```

### AI Gateway (único)

```javascript
// server/services/ai.service.cjs
class AIGateway {
  constructor() {
    this.providers = [
      { name: 'gemini', key: process.env.GEMINI_API_KEY, fn: this.callGemini },
      { name: 'groq', key: process.env.GROQ_API_KEY, fn: this.callGroq },
      { name: 'mistral', key: process.env.MISTRAL_API_KEY, fn: this.callMistral },
    ].filter(p => p.key);
  }

  async process(message, systemPrompt) {
    for (const provider of this.providers) {
      try {
        return await provider.fn.call(this, message, systemPrompt);
      } catch (err) {
        console.warn(`${provider.name} failed, trying next...`);
      }
    }
    throw new Error('Nenhum provedor de IA disponível');
  }

  async callGemini(message, systemPrompt) { /* ... */ }
  async callGroq(message, systemPrompt) { /* ... */ }
  async callMistral(message, systemPrompt) { /* ... */ }
}

module.exports = { AIGateway };
```

### Property Service

```javascript
// server/services/property.service.cjs
class PropertyService {
  constructor(dataEngine) {
    this.db = dataEngine;
  }

  async getAll(creci) { /* ... */ }
  async getById(id) { /* ... */ }
  async create(property) { /* ... */ }
  async update(id, data) { /* ... */ }
  async delete(id) { /* ... */ }
  async getStatusBatch(ids) { /* ... */ }
}

module.exports = { PropertyService };
```

### Telegram Service

```javascript
// server/services/telegram.service.cjs
class TelegramService {
  constructor(token, aiGateway) {
    this.token = token;
    this.ai = aiGateway;
    this.conversations = new Map();
  }

  async handleMessage(msg) { /* ... */ }
  async sendWelcome(chatId, username) { /* ... */ }
  async sendHelp(chatId) { /* ... */ }
  async processCommand(command, chatId) { /* ... */ }
}

module.exports = { TelegramService };
```

### Tarefas

- [ ] Criar `server/services/ai.service.cjs`
- [ ] Criar `server/services/property.service.cjs`
- [ ] Criar `server/services/lead.service.cjs`
- [ ] Criar `server/services/appointment.service.cjs`
- [ ] Criar `server/services/telegram.service.cjs`
- [ ] Criar `server/services/marketing.service.cjs` (refatorar de marketing-engine.cjs)
- [ ] Criar `server/services/auth.service.cjs`
- [ ] Refatorar `server/index.cjs` para usar services
- [ ] Remover lógica inline do index.cjs

---

*Shard 3: Services Layer — IAmobil Architecture*
