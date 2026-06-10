# Story 006: Login Screen & useAuth

## Status
[ ] Draft
[x] In Progress
[ ] Ready for Review
[ ] Done

## Context
Não existe tela de login. O app carrega direto no dashboard. Autenticação não existe no frontend.

**Fonte:** `docs/architecture/shards/shard-5-frontend.md`, `shard-2-auth.md`

## Acceptance Criteria
- [x] Criar `src/components/Login.tsx` (tela de login completa)
- [x] Criar `src/hooks/useAuth.ts` (login, logout, registro, token management)
- [x] Adicionar rota `/login` no React Router
- [x] Redirecionar para `/login` se não autenticado
- [x] Salvar token no localStorage
- [x] Enviar token Bearer em todas as requisições
- [ ] Botão de logout no Sidebar/ProfileView
- [ ] `npm run build` sem erros

## File List
- [x] `src/components/Login.tsx` (novo)
- [x] `src/hooks/useAuth.ts` (novo)
- [x] `src/App.tsx` (modificado — rotas protegidas)
- [x] `src/services/api.ts` (modificado — Bearer token)
- [ ] `src/components/Sidebar.tsx` (modificado — botão logout)
- [ ] `src/components/ProfileView.tsx` (modificado — botão logout)

## Technical Notes
- Login com validação de campos
- Mensagens de erro claras
- Credenciais de teste na tela
- Redirecionamento automático após login
- Token persistido via Zustand + persist

## Testing
- [x] Tela de login renderiza corretamente
- [x] Login com credenciais válidas redireciona para dashboard
- [x] Login com credenciais inválidas mostra erro
- [x] Logout limpa token e redireciona para login
- [x] Rotas protegidas redirecionam para login sem token

## CodeRabbit Integration
- **Focus:** Auth patterns, token storage, route protection
- **Severity:** HIGH — insecure token storage, MEDIUM — missing logout

## Dependencies
- Story 002 (Auth middleware)
- Story 005 (React Query + API service)
- Shard: `docs/architecture/shards/shard-5-frontend.md`
