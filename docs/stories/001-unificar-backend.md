# Story 001: Unificar Backend

## Status
[ ] Draft
[ ] In Progress
[ ] Ready for Review
[ ] Done

## Context
O IAmobil tem dois backends independentes:
- `server/index.cjs` (Express, ~1400 linhas, CJS)
- `api/*.js` (Serverless, ESM, Vercel)

Ambos acessam o mesmo Turso DB com implementações diferentes.

## Acceptance Criteria
- [ ] Unificar em um único módulo de banco (`server/db/`)
- [ ] Extrair services: telegram, AI, marketing
- [ ] Adicionar JWT auth middleware
- [ ] Remover `api/_lib/db.js` duplicado
- [ ] Todos os endpoints funcionando via Express
- [ ] `npm run build` sem erros

## File List
- [ ] `server/db/index.cjs` (novo)
- [ ] `server/services/telegram.cjs` (novo)
- [ ] `server/services/ai.cjs` (novo)
- [ ] `server/middleware/auth.cjs` (novo)
- [ ] `server/index.cjs` (refatorado)
- [ ] `api/` (removido)
