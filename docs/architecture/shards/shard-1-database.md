# Shard 1: Database Layer

> **Source:** fullstack-architecture.md §5.1  
> **For:** @sm, @dev, @data-engineer

---

## Problema Atual

3 instâncias de DataEngine criando conexões separadas:
- `server/index.cjs` → `new DataEngine()`
- `server/marketing-engine.cjs` → `new DataEngine()`
- `api/_lib/db.js` → `createClient()` (ESM)

Schema divergente: `creci` como PK vs `login` como PK na tabela `brokers`.

## Solução

### Único DataEngine Singleton

```
server/db/
├── index.cjs        # DataEngine singleton
├── schema.cjs       # Definição de tabelas
└── migrations.cjs   # Migrations controladas
```

### Especificação

```javascript
// server/db/index.cjs
class DataEngine {
  constructor() { this.client = null; }
  
  async initialize() {
    this.client = createClient({ 
      url: process.env.TURSO_DATABASE_URL, 
      authToken: process.env.TURSO_AUTH_TOKEN 
    });
    await this.initializeTables();
  }
  
  // CRUD: getProperties, addProperty, deleteProperty
  // CRUD: getLeads, addLead
  // CRUD: getAppointments, addAppointment
  // CRUD: getBroker, upsertBroker
  // CRUD: getCampaigns, addCampaign, deleteCampaign
  // CRUD: createUser, validateUser
}

// Singleton
let instance = null;
module.exports = {
  getDataEngine: async () => {
    if (!instance) { instance = new DataEngine(); await instance.initialize(); }
    return instance;
  }
};
```

### Schema Unificado

```sql
-- Tabela brokers (PK: creci)
CREATE TABLE IF NOT EXISTS brokers (
  creci TEXT PRIMARY KEY,
  name TEXT,
  login TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  photo TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
);

-- Tabela users (PK: login)
CREATE TABLE IF NOT EXISTS users (
  login TEXT PRIMARY KEY,
  password_hash TEXT,
  creci TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
);

-- Properties, leads, appointments, campaigns mantêm schema atual
```

### Tarefas

- [ ] Criar `server/db/schema.cjs` com definição de tabelas
- [ ] Criar `server/db/index.cjs` com DataEngine singleton
- [ ] Criar `server/db/migrations.cjs` para ALTER TABLEs controlados
- [ ] Atualizar `server/index.cjs` para usar `getDataEngine()`
- [ ] Atualizar `server/marketing-engine.cjs` para usar `getDataEngine()`
- [ ] Remover `api/_lib/db.js`

---

*Shard 1: Database Layer — IAmobil Architecture*
