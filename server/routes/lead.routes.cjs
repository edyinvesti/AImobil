// server/routes/lead.routes.cjs
// Rotas de leads

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

module.exports = function(leadService, authMiddleware) {
  // GET /api/leads
  router.get('/', authMiddleware, async (req, res, next) => {
    try {
      const leads = await leadService.getAll();
      res.json(leads);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/leads/:id
  router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
      const lead = await leadService.getById(Number(req.params.id));
      res.json(lead);
    } catch (e) {
      next(e);
    }
  });

  // POST /api/leads
  router.post('/', authMiddleware, [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('phone').notEmpty().withMessage('Telefone é obrigatório')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await leadService.create(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  });

  // PUT /api/leads/:id
  router.put('/:id', authMiddleware, async (req, res, next) => {
    try {
      const result = await leadService.update(Number(req.params.id), req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // DELETE /api/leads/:id
  router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
      const result = await leadService.delete(Number(req.params.id));
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/leads/status/:status
  router.get('/status/:status', authMiddleware, async (req, res, next) => {
    try {
      const leads = await leadService.getByStatus(req.params.status);
      res.json(leads);
    } catch (e) {
      next(e);
    }
  });

  // PUT /api/leads/:id/score
  router.put('/:id/score', authMiddleware, [
    body('score').isNumeric().withMessage('Score deve ser numérico')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await leadService.updateScore(Number(req.params.id), req.body.score);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // PUT /api/leads/:id/status
  router.put('/:id/status', authMiddleware, [
    body('status').notEmpty().withMessage('Status é obrigatório')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await leadService.updateStatus(Number(req.params.id), req.body.status);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
};
