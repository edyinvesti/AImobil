# Story 003: Services Layer

## Status
[ ] Draft
[x] In Progress
[ ] Ready for Review
[ ] Done

## Context
O `server/index.cjs` é um monolito de 61KB com toda a lógica de negócio inline: Telegram bot (~250 linhas), AI gateway (3 implementações), todas as rotas, validação, HTML estático.

**Fonte:** `docs/architecture/shards/shard-3-services.md`

## Acceptance Criteria
- [x] Criar `server/services/ai.service.cjs` (Gemini → Groq → Mistral fallback)
- [x] Criar `server/services/property.service.cjs` (CRUD imóveis)
- [x] Criar `server/services/lead.service.cjs` (CRUD leads)
- [x] Criar `server/services/appointment.service.cjs` (agendamentos)
- [x] Criar `server/services/telegram.service.cjs` (bot Telegram)
- [x] Criar `server/services/marketing.service.cjs` (refatorar de marketing-engine.cjs)
- [x] Criar `server/services/auth.service.cjs` (login, registro, JWT)
- [x] Criar `server/utils/logger.cjs` (winston config)
- [x] Criar `server/utils/errors.cjs` (classes de erro customizadas)
- [ ] Refatorar `server/index.cjs` para usar services
- [ ] `server/index.cjs` < 200 linhas
- [ ] `npm start` sem erros

## File List
- [x] `server/services/ai.service.cjs` (novo)
- [x] `server/services/property.service.cjs` (novo)
- [x] `server/services/lead.service.cjs` (novo)
- [x] `server/services/appointment.service.cjs` (novo)
- [x] `server/services/telegram.service.cjs` (novo)
- [x] `server/services/marketing.service.cjs` (novo)
- [x] `server/services/auth.service.cjs` (novo)
- [x] `server/utils/logger.cjs` (novo)
- [x] `server/utils/errors.cjs` (novo)
- [ ] `server/index.cjs` (refatorado — apenas montagem)
- [ ] `server/hermes-gateway-adapter.cjs` (removido — substituído por ai.service)

## Technical Notes
- AI Gateway: fallback chain Mistral → Groq → Gemini
- Services recebem DataEngine via constructor (dependency injection)
- Telegram service: extrair de index.cjs linhas 34-119
- AI functions: extrair de index.cjs linhas 187-310

## Testing
- [ ] `npm start` inicia sem erros
- [ ] Todas as rotas funcionam (auth, properties, leads, marketing)
- [ ] AI fallback chain funciona (testar sem API key de um provider)
- [ ] Telegram bot responde comandos básicos

## CodeRabbit Integration
- **Focus:** Service patterns, dependency injection, error handling
- **Severity:** HIGH — tight coupling, MEDIUM — missing error handling

## Dependencies
- Story 001 (DataEngine)
- Story 002 (Auth middleware)
- Shard: `docs/architecture/shards/shard-3-services.md`
