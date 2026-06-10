# Story 005: React Query Migration

## Status
[ ] Draft
[x] In Progress
[ ] Ready for Review
[ ] Done

## Context
React Query está instalado mas não usado. `useProperties.ts` é um "god hook" de 507 linhas com fetch manual (useState + useEffect). Cache manual via localStorage.

**Fonte:** `docs/architecture/shards/shard-5-frontend.md`

## Acceptance Criteria
- [x] Criar `src/services/api.ts` (instância fetch configurada com JWT)
- [x] Criar `src/hooks/useAuth.ts` (login, logout, token management)
- [x] Refatorar `src/hooks/useProperties.ts` para React Query
- [x] Refatorar `src/hooks/useLeads.ts` para React Query
- [x] Criar `src/hooks/useCampaigns.ts` (React Query)
- [ ] Atualizar componentes para usar novos hooks
- [ ] Remover fetch manual de todos os componentes
- [ ] `npm run build` sem erros

## File List
- [x] `src/services/api.ts` (novo)
- [x] `src/hooks/useAuth.ts` (novo)
- [x] `src/hooks/useProperties.ts` (refatorado)
- [x] `src/hooks/useLeads.ts` (refatorado)
- [x] `src/hooks/useCampaigns.ts` (novo)
- [ ] `src/components/Dashboard.tsx` (modificado — usar useQuery)
- [ ] `src/components/Campaigns.tsx` (modificado — usar useQuery)
- [ ] `src/components/Appointments.tsx` (modificado — usar useQuery)

## Technical Notes
- API service com interceptação de JWT automática
- useAuth usando Zustand com persist
- Query Keys organizadas por domínio
- Stale time de 5 minutos para reduzir requests
- Invalidação automática após mutations

## Testing
- [ ] Login retorna token e salva no localStorage
- [ ] Properties são buscadas automaticamente
- [ ] Cache funciona (não refaz fetch em navegação)
- [ ] Logout limpa token e cache

## CodeRabbit Integration
- **Focus:** React patterns, hook dependencies, query invalidation
- **Severity:** MEDIUM — stale data, LOW — unused imports

## Dependencies
- Story 002 (Auth middleware)
- Story 004 (Routes)
- Shard: `docs/architecture/shards/shard-5-frontend.md`
