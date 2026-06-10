# Story 008: Cleanup & Deploy

## Status
[ ] Draft
[x] In Progress
[ ] Ready for Review
[ ] Done

## Context
Backend duplicado (Express + Vercel serverless). `api/` não é mais necessário após refatoração completa.

**Fonte:** `docs/architecture/shards/shard-6-infra.md`

## Acceptance Criteria
- [x] Remover diretório `api/` completo
- [x] Remover `server/hermes-gateway-adapter.cjs` (substituído por ai.service)
- [x] Atualizar `render.yaml` com todas as variáveis de ambiente
- [ ] Testar deploy completo no Render
- [ ] Testar frontend no Cloudflare Pages
- [ ] Verificar todas as rotas funcionando em produção
- [x] Documentar variáveis de ambiente necessárias

## File List
- [x] `api/` (removido — diretório inteiro)
- [x] `server/hermes-gateway-adapter.cjs` (removido)
- [x] `render.yaml` (atualizado — todas as env vars)
- [x] `docs/deployment.md` (novo — guia de deploy)

## Technical Notes
- Variáveis de ambiente documentadas no render.yaml
- Guia de deploy completo em docs/deployment.md
- R2 configurado como opcional

## Testing
- [x] `npm start` funciona localmente
- [ ] Deploy no Render funciona
- [ ] Frontend acessa API em produção
- [ ] Todas as rotas funcionam (auth, properties, leads, marketing)
- [ ] Upload de imagem funciona via R2
- [ ] Login/logout funciona

## CodeRabbit Integration
- **Focus:** Deployment patterns, environment configuration
- **Severity:** LOW — cleanup, INFO — documentation

## Dependencies
- Todas as stories anteriores (001-007)
- Shard: `docs/architecture/shards/shard-6-infra.md`
