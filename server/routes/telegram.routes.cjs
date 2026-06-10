// server/routes/telegram.routes.cjs
// Rotas do Telegram bot

const express = require('express');
const router = express.Router();

module.exports = function(telegramService) {
  // POST /api/telegram/webhook
  router.post('/webhook', async (req, res) => {
    try {
      const message = req.body.message;
      if (message) {
        // Processar mensagem em background
        telegramService.handleMessage(message).catch(e => {
          console.error('Telegram message handling error:', e);
        });
      }
      res.sendStatus(200);
    } catch (e) {
      console.error('Telegram webhook error:', e);
      res.sendStatus(200); // Sempre retornar 200 para o Telegram
    }
  });

  // GET /api/telegram/status
  router.get('/status', async (req, res) => {
    try {
      const analytics = telegramService.getAnalytics();
      res.json({
        configured: !!process.env.TELEGRAM_BOT_TOKEN,
        ...analytics
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
