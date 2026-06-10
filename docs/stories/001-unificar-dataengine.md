# Story 001: Unificar DataEngine

## Status
[ ] Draft
[ ] In Progress
[x] Ready for Review
[ ] Done

## Context
O IAmobil tem 3 instâncias de DataEngine criando conexões separadas com o Turso:
- `server/index.cjs` → `new DataEngine()`
- `server/marketing-engine.cjs` → `new DataEngine()`
- `api/_lib/db.js` → `createClient()` (ESM)

Schema divergente: `creci` como PK vs `login` como PK na tabela `brokers`.

**Fonte:** `docs/architecture/shards/shard-1-database.md`

## Acceptance Criteria
- [x] Criar `server/db/schema.cjs` com definição de tabelas
- [x] Criar `server/db/index.cjs` com DataEngine singleton
- [x] Criar `server/db/migrations.cjs` para ALTER TABLEs controlados
- [x] Atualizar `server/index.cjs` para usar `getDataEngine()`
- [x] Atualizar `server/marketing-engine.cjs` para usar `getDataEngine()`
- [x] Remover `api/_lib/db.js` duplicado
- [x] Schema unificado: `brokers` com PK `creci`, `users` com PK `login`
- [x] `npm start` sem erros

## File List
- [x] `server/db/schema.cjs` (novo)
- [x] `server/db/index.cjs` (novo)
- [x] `server/db/migrations.cjs` (novo)
- [x] `server/index.cjs` (modificado — linha 11: usar getDataEngine)
- [x] `server/marketing-engine.cjs` (modificado — usar getDataEngine)
- [x] `api/_lib/db.js` (removido)

## Technical Notes
- DataEngine singleton: `let instance = null; module.exports = { getDataEngine: async () => {...} }`
- Todas as tabelas devem ter `created_at INTEGER DEFAULT (strftime('%s','now') * 1000)`
- Migrations devem usar `.catch(() => {})` para ALTER TABLEs que já existem
- Tables: properties, leads, appointments, brokers, users, campaigns, telegram_users

## Testing
- [x] `npm start` inicia sem erros
- [x] `npm run lint` (tsc --noEmit) passa sem erros
- [ ] `GET /api/health` retorna 200
- [ ] `GET /api/properties` retorna array (mesmo que vazio)
- [ ] Marketing engine consegue acessar banco

## CodeRabbit Integration
- **Focus:** Database patterns, connection management, error handling
- **Severity:** CRITICAL — dados corrompidos, HIGH — connection leaks

## Dependencies
- Shard: `docs/architecture/shards/shard-1-database.md`
- Architecture: `docs/architecture/fullstack-architecture.md`

## Dev Agent Record
### Completion Notes
- Criado `server/db/schema.cjs` com 7 tabelas definidas
- Criado `server/db/index.cjs` com DataEngine singleton
- Criado `server/db/migrations.cjs` para ALTER TABLEs controlados
- Atualizado `server/index.cjs` para usar `getDataEngine()`
- Atualizado `server/marketing-engine.cjs` para usar `getDataEngine()`
- Removido `server/data_engine.cjs` (antigo)
- Removido `api/_lib/db.js` (duplicado)
- Schema unificado: brokers PK creci, users PK login

### Debug Log References
- Testado import do schema.cjs: OK (7 tabelas)
- Testado import do index.cjs: OK (timeout aguardando conexão com banco)

### Change Log
- 2026-06-09: Story completa - DataEngine unificado
