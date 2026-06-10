# Shard 4: Routes Layer

> **Source:** fullstack-architecture.md §3, §4  
> **For:** @sm, @dev

---

## Problema Atual

- Todas as rotas definidas inline em `server/index.cjs`
- CORS inconsistente (configurável no Express, `*` no serverless)
- Validação parcial

## Solução

### Rotas Modulares

```
server/routes/
├── auth.routes.cjs         # POST /api/auth/login, /register
├── property.routes.cjs     # GET/POST/DELETE /api/properties
├── lead.routes.cjs         # GET/POST /api/leads
├── appointment.routes.cjs  # GET /api/appointments
├── marketing.routes.cjs    # POST /api/marketing/criar-campanha
├── telegram.routes.cjs     # POST /api/telegram/webhook
└── health.routes.cjs       # GET /api/health
```

### Exemplo de Rota

```javascript
// server/routes/property.routes.cjs
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { validateProperty } = require('../middleware/validate.middleware');

module.exports = function(propertyService) {
  // GET /api/properties — listing (requer auth)
  router.get('/', authMiddleware, async (req, res, next) => {
    try {
      const creci = req.user.creci;
      const properties = await propertyService.getAll(creci);
      res.json(properties);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/properties — criar (requer auth + validação)
  router.post('/', authMiddleware, validateProperty, async (req, res, next) => {
    try {
      const property = await propertyService.create({
        ...req.body,
        brokerCreci: req.user.creci
      });
      res.status(201).json(property);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/properties/:id
  router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
      await propertyService.delete(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
```

### Montagem no index.cjs

```javascript
// server/index.cjs (refatorado)
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const leadRoutes = require('./routes/lead.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const marketingRoutes = require('./routes/marketing.routes');
const telegramRoutes = require('./routes/telegram.routes');
const healthRoutes = require('./routes/health.routes');

app.use('/api/auth', authRoutes(authService));
app.use('/api/properties', propertyRoutes(propertyService));
app.use('/api/leads', leadRoutes(leadService));
app.use('/api/appointments', appointmentRoutes(appointmentService));
app.use('/api/marketing', marketingRoutes(marketingService));
app.use('/api/telegram', telegramRoutes(telegramService));
app.use('/api/health', healthRoutes());
```

### Tarefas

- [ ] Criar `server/routes/auth.routes.cjs`
- [ ] Criar `server/routes/property.routes.cjs`
- [ ] Criar `server/routes/lead.routes.cjs`
- [ ] Criar `server/routes/appointment.routes.cjs`
- [ ] Criar `server/routes/marketing.routes.cjs`
- [ ] Criar `server/routes/telegram.routes.cjs`
- [ ] Criar `server/routes/health.routes.cjs`
- [ ] Refatorar `server/index.cjs` para montagem modular
- [ ] Remover rotas inline do index.cjs

---

*Shard 4: Routes Layer — IAmobil Architecture*
