// server/routes/property.routes.cjs
// Rotas de imóveis

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

module.exports = function(propertyService, authMiddleware) {
  // GET /api/properties
  router.get('/', async (req, res, next) => {
    try {
      const properties = await propertyService.getAll();
      res.json(properties);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/properties/:id
  router.get('/:id', async (req, res, next) => {
    try {
      const property = await propertyService.getById(req.params.id);
      res.json(property);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/properties/search
  router.get('/search', async (req, res, next) => {
    try {
      const filters = {
        city: req.query.city,
        neighborhood: req.query.neighborhood,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        bedrooms: req.query.bedrooms ? Number(req.query.bedrooms) : undefined
      };
      const properties = await propertyService.search(filters);
      res.json(properties);
    } catch (e) {
      next(e);
    }
  });

  // POST /api/properties
  router.post('/', authMiddleware, [
    body('title').notEmpty().withMessage('Título é obrigatório'),
    body('price').isNumeric().withMessage('Preço deve ser numérico')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await propertyService.create(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  });

  // PUT /api/properties/:id
  router.put('/:id', authMiddleware, [
    body('title').optional().notEmpty().withMessage('Título não pode ser vazio'),
    body('price').optional().isNumeric().withMessage('Preço deve ser numérico')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await propertyService.update(req.params.id, req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // DELETE /api/properties/:id
  router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
      const result = await propertyService.delete(req.params.id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/properties/broker/:login
  router.get('/broker/:login', async (req, res, next) => {
    try {
      const properties = await propertyService.getByBroker(req.params.login);
      res.json(properties);
    } catch (e) {
      next(e);
    }
  });

  return router;
};
