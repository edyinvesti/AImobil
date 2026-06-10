// server/routes/marketing.routes.cjs
// Rotas de marketing

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

module.exports = function(marketingService, authMiddleware) {
  // GET /api/marketing/campaigns
  router.get('/campaigns', authMiddleware, async (req, res, next) => {
    try {
      const campaigns = await marketingService.getCampaigns();
      res.json(campaigns);
    } catch (e) {
      next(e);
    }
  });

  // POST /api/marketing/campaigns
  router.post('/campaigns', authMiddleware, [
    body('property_id').notEmpty().withMessage('Property ID é obrigatório')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await marketingService.criarCampanha(req.body.property_id, req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  });

  // DELETE /api/marketing/campaigns/:id
  router.delete('/campaigns/:id', authMiddleware, async (req, res, next) => {
    try {
      const result = await marketingService.deleteCampaign(req.params.id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // POST /api/marketing/instagram/post
  router.post('/instagram/post', authMiddleware, [
    body('property_id').notEmpty().withMessage('Property ID é obrigatório')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await marketingService.postarNoInstagram(req.body.property_id, req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  });

  // DELETE /api/marketing/instagram/:postId
  router.delete('/instagram/:postId', authMiddleware, async (req, res, next) => {
    try {
      const result = await marketingService.deletarDoInstagram(req.params.postId);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/marketing/status
  router.get('/status', authMiddleware, async (req, res, next) => {
    try {
      const status = await marketingService.getStatus();
      res.json(status);
    } catch (e) {
      next(e);
    }
  });

  return router;
};
