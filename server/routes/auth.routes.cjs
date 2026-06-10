// server/routes/auth.routes.cjs
// Rotas de autenticação

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

module.exports = function(authService) {
  // POST /api/auth/login
  router.post('/login', [
    body('login').notEmpty().withMessage('Login é obrigatório'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { login, password } = req.body;
      const result = await authService.login(login, password);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // POST /api/auth/register
  router.post('/register', [
    body('login').notEmpty().withMessage('Login é obrigatório'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter mínimo 6 caracteres'),
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/auth/me
  router.get('/me', async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const decoded = authService.verifyToken(token);
      res.json({ user: decoded });
    } catch (e) {
      next(e);
    }
  });

  return router;
};
