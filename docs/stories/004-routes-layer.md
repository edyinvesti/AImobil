# Story 004: Routes Layer

## Status
[ ] Draft
[ ] In Progress
[x] Ready for Review
[ ] Done

## Context
Todas as rotas estão definidas inline em `server/index.cjs`. CORS inconsistente entre Express e serverless. Validação parcial.

**Fonte:** `docs/architecture/shards/shard-4-routes.md`

## Acceptance Criteria
- [x] Criar `server/routes/auth.routes.cjs`
- [x] Criar `server/routes/property.routes.cjs`
- [x] Criar `server/routes/lead.routes.cjs`
- [x] Criar `server/routes/appointment.routes.cjs`
- [x] Criar `server/routes/marketing.routes.cjs`
- [x] Criar `server/routes/telegram.routes.cjs`
- [x] Criar `server/routes/health.routes.cjs`
- [x] Cada rota usa authMiddleware quando necessário
- [x] Cada rota usa validação (express-validator)
- [x] index.cjs apenas monta rotas (app.use)
- [x] `npm start` sem erros

## File List
- [x] `server/routes/auth.routes.cjs` (novo)
- [x] `server/routes/property.routes.cjs` (novo)
- [x] `server/routes/lead.routes.cjs` (novo)
- [x] `server/routes/appointment.routes.cjs` (novo)
- [x] `server/routes/marketing.routes.cjs` (novo)
- [x] `server/routes/telegram.routes.cjs` (novo)
- [x] `server/routes/health.routes.cjs` (novo)
- [x] `server/index.cjs` (refatorado — apenas montagem de rotas)

## Technical Notes
- Routes usam dependency injection para services
- authMiddleware aplicado nas rotas protegidas
- express-validator para validação de input
- Error handling via next(err)
- server/index.cjs reduzido de 1510 para ~180 linhas

## Testing
- [x] Todas as rotas respondem corretamente
- [x] Rotas protegidas retornam 401 sem token
- [x] Rotas públicas funcionam sem token
- [x] Validação retorna 400 com dados inválidos

## CodeRabbit Integration
- **Focus:** Route patterns, middleware composition, error propagation
- **Severity:** MEDIUM — inconsistent error handling

## Dependencies
- Story 002 (Auth middleware)
- Story 003 (Services)
- Shard: `docs/architecture/shards/shard-4-routes.md`
