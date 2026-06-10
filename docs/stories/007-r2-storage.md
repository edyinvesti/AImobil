# Story 007: R2 Image Storage

## Status
[ ] Draft
[x] In Progress
[ ] Ready for Review
[ ] Done

## Context
Imagens estão armazenadas como base64 no SQLite, causando OOM em listagens. Queries excluem a coluna `images` para evitar crash.

**Fonte:** `docs/architecture/shards/shard-6-infra.md`

## Acceptance Criteria
- [x] Criar `server/services/storage.service.cjs` (Cloudflare R2)
- [ ] Criar bucket R2 `iamobil-images`
- [ ] Configurar variáveis de ambiente R2 no Render
- [x] Upload de imagens vai para R2 (não mais base64 no banco)
- [x] URLs das imagens salvas no Turso
- [x] Criar script de migração de imagens existentes
- [ ] Frontend usa URLs do R2 (não mais base64)
- [ ] `npm run build` sem erros

## File List
- [x] `server/services/storage.service.cjs` (novo)
- [x] `scripts/migrate-images-to-r2.cjs` (novo)
- [x] `server/services/property.service.cjs` (modificado — upload R2)
- [ ] `server/routes/property.routes.cjs` (modificado — multipart upload)
- [ ] `src/components/PropertyForm.tsx` (modificado — enviar para R2)
- [ ] `src/utils.ts` (modificado — resolveImageUrl usa R2 URLs)
- [ ] `render.yaml` (modificado — variáveis R2)

## Technical Notes
- StorageService com S3Client para Cloudflare R2
- Upload automático de base64 para R2
- Fallback para base64 quando R2 não configurado
- Script de migração para imagens existentes
- URLs públicas para acesso às imagens

## Testing
- [ ] Upload de imagem retorna URL do R2
- [ ] Imagem é acessível via URL pública
- [ ] Property listing retorna URLs (não base64)
- [ ] Migração funciona para imagens existentes

## CodeRabbit Integration
- **Focus:** Storage patterns, error handling, migration safety
- **Severity:** HIGH — data loss during migration, MEDIUM — missing cleanup

## Dependencies
- Story 001 (DataEngine)
- Story 003 (Services)
- Shard: `docs/architecture/shards/shard-6-infra.md`
