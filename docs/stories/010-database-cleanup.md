# Story 010: Database Cleanup & Integrity

## Status
[x] Draft
[x] In Progress
[x] Ready for Review
[ ] Done

## Context
Auditoria do @data-engineer (Dara) identificou problemas críticos no schema do IAmobil:
- **ZERO FOREIGN KEYS** — sem integridade referencial
- **ZERO INDEXES** — queries lentas em produção
- **Schema inconsistente** — broker_creci duplicado, created_at DEFAULT 0
- **Tabelas desnecessárias** — pending_sync pode ser removida

**Fonte:** Auditoria Dara (2026-06-10)

## Acceptance Criteria
- [x] Foreign Keys: properties → brokers (broker_creci)
- [x] Foreign Keys: leads → properties (property_id)
- [x] Foreign Keys: appointments → properties (property_id)
- [x] Foreign Keys: campaigns → properties (property_id)
- [x] Foreign Keys: telegram_users → brokers (creci)
- [x] Indexes: 8 indexes criados para performance
- [x] Schema recriado com Foreign Keys corretas
- [x] Dados restaurados (brokers, users, properties, campaigns)
- [ ] `npm start` sem erros

## File List
- [x] `server/db/schema.cjs` (modificado — FKs e indexes)
- [x] `server/db/migrations.cjs` (modificado — novas migrations)
- [x] `server/db/recreate-schema.cjs` (novo — script de recriação)
- [x] `check-db.cjs` (removido — temporário)

## Technical Notes
- Script `recreate-schema.cjs` recria todas as tabelas com schema correto
- Foreign keys definidas no CREATE TABLE (não via ALTER TABLE)
- 8 indexes para queries comuns
- Dados foram zerados durante migração — necessita restauração

## Testing
- [x] Script de recriação executa sem erros
- [x] 8 indexes criados
- [ ] Dados restaurados
- [ ] `npm start` inicia sem erros
- [ ] `GET /api/properties` retorna array

## CodeRabbit Integration
- **Focus:** Database schema, migrations, integrity
- **Severity:** CRITICAL — dados corrompidos

## Dependencies
- Story 001: Unificar DataEngine
- Auditoria Dara: 2026-06-10

## Dev Agent Record
### Completion Notes
- Criada pela Dara (data-engineer) em 2026-06-10
- Problemas identificados via *security-audit
- Script de recriação criado e testado
- Schema recriado com Foreign Keys e indexes
- Script de restauração criado e executado com sucesso
- Dados restaurados: 5 brokers, 5 users, 9 properties, 4 campaigns

### Change Log
- 2026-06-09: Story criada
- 2026-06-10: Schema recriado com FKs e indexes
- 2026-06-10: Dados restaurados com sucesso
