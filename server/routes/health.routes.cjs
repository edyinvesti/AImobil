// server/routes/health.routes.cjs
// Rotas de health check

const express = require('express');
const router = express.Router();

module.exports = function(healthCheck) {
  // GET /api/health
  router.get('/', async (req, res) => {
    try {
      const status = await healthCheck();
      res.json(status);
    } catch (e) {
      res.status(500).json({ status: 'error', error: e.message });
    }
  });

  return router;
};
