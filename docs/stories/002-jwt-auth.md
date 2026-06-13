# Story 002: JWT Auth Middleware

## Status
[ ] Draft
[ ] In Progress
[x] Ready for Review
[ ] Done

## Context
O IAmobil não tem autenticação. Token base64 é gerado mas nunca validado. Qualquer pessoa acessa/modifica dados de qualquer broker.

**Fonte:** `docs/architecture/shards/shard-2-auth.md`

## Acceptance Criteria
- [x] Criar `server/middleware/auth.middleware.cjs` com verificação JWT
- [x] Criar `server/middleware/validate.middleware.cjs` com express-validator
- [x] Criar `server/middleware/error.middleware.cjs` com tratamento centralizado
- [x] Instalar `jsonwebtoken` no package.json
- [x] Gerar JWT no login com expiração de 24h
- [x] Proteger rotas: /api/properties/*, /api/leads/*, /api/marketing/*
- [x] Rotas públicas: /api/auth/*, /api/health
- [x] `npm run build` sem erros

## File List
- [x] `server/middleware/auth.middleware.cjs` (novo)
- [x] `server/middleware/validate.middleware.cjs` (novo)
- [x] `server/middleware/error.middleware.cjs` (novo)
- [x] `server/index.cjs` (modificado — adicionar middlewares)
- [x] `package.json` (modificado — adicionar jsonwebtoken)

## Technical Notes
```javascript
// auth.middleware.cjs
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET não configurado');
  process.exit(1);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function generateToken(user) {
  return jwt.sign({ login: user.login, creci: user.creci }, JWT_SECRET, { expiresIn: '24h' });
}
```

## Testing
- [x] POST /api/auth/login retorna token JWT
- [x] GET /api/properties sem token retorna 401
- [x] GET /api/properties com token válido retorna 200
- [x] GET /api/health não requer token

## CodeRabbit Integration
- **Focus:** Security patterns, JWT implementation, token handling
- **Severity:** CRITICAL — auth bypass, HIGH — insecure token storage

## Dependencies
- Story 001 (DataEngine unificado)
- Shard: `docs/architecture/shards/shard-2-auth.md`

## Dev Agent Record
### Completion Notes
- Criado `server/middleware/auth.middleware.cjs` com verificação JWT
- Criado `server/middleware/validate.middleware.cjs` com express-validator
- Criado `server/middleware/error.middleware.cjs` com tratamento centralizado
- Instalado `jsonwebtoken` no package.json
- Atualizado login para gerar JWT com expiração de 24h
- Adicionado authMiddleware em todas as rotas protegidas
- Rotas públicas: /api/auth/*, /api/health

### Debug Log References
- Testado import dos middlewares: OK
- Testado npm install jsonwebtoken: OK

### Change Log
- 2026-06-09: Story completa - JWT Auth Middleware
