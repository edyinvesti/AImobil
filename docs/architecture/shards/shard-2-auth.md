# Shard 2: Auth & Security

> **Source:** fullstack-architecture.md §5.2, §7  
> **For:** @sm, @dev

---

## Problema Atual

- Token base64 gerado mas **nunca validado**
- Nenhum middleware de autenticação
- Qualquer pessoa acessa/modifica dados de qualquer broker
- Validação inconsistente entre Express e serverless

## Solução

### JWT Auth Middleware

```
server/middleware/
├── auth.middleware.cjs    # Verificação JWT
├── validate.middleware.cjs # express-validator
└── error.middleware.cjs    # Tratamento centralizado
```

### Especificação

```javascript
// server/middleware/auth.middleware.cjs
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
    req.user = decoded; // { login, creci, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Login: gera JWT com expiração de 24h
function generateToken(user) {
  return jwt.sign(
    { login: user.login, creci: user.creci },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
```

### Validação de Rotas

```javascript
// server/middleware/validate.middleware.cjs
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validações específicas
const validateLogin = [
  body('login').isString().notEmpty(),
  body('password').isString().isLength({ min: 6 }),
  validate
];

const validateProperty = [
  body('title').isString().notEmpty(),
  body('price').isNumeric(),
  body('type').isIn(['apartamento', 'casa', 'terreno', 'comercial', 'rural']),
  validate
];

module.exports = { validate, validateLogin, validateProperty };
```

### Error Handler

```javascript
// server/middleware/error.middleware.cjs
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
```

### Rotas Protegidas

| Rota | Método | Auth |
|------|--------|------|
| `/api/auth/login` | POST | ❌ |
| `/api/auth/register` | POST | ❌ |
| `/api/properties/*` | GET/POST/DELETE | ✅ |
| `/api/leads/*` | GET/POST | ✅ |
| `/api/marketing/*` | POST | ✅ |
| `/api/health` | GET | ❌ |

### Tarefas

- [ ] Criar `server/middleware/auth.middleware.cjs`
- [ ] Criar `server/middleware/validate.middleware.cjs`
- [ ] Criar `server/middleware/error.middleware.cjs`
- [ ] Atualizar `server/index.cjs` para usar JWT
- [ ] Atualizar rotas para usar `authMiddleware`
- [ ] Atualizar frontend para enviar token Bearer
- [ ] Criar tela de login (Login.tsx)
- [ ] Criar hook `useAuth.ts`

---

*Shard 2: Auth & Security — IAmobil Architecture*
