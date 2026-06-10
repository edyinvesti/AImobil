// server/routes/appointment.routes.cjs
// Rotas de agendamentos

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

module.exports = function(appointmentService, authMiddleware) {
  // GET /api/appointments
  router.get('/', authMiddleware, async (req, res, next) => {
    try {
      const appointments = await appointmentService.getAll();
      res.json(appointments);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/appointments/:id
  router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
      const appointment = await appointmentService.getById(Number(req.params.id));
      res.json(appointment);
    } catch (e) {
      next(e);
    }
  });

  // POST /api/appointments
  router.post('/', authMiddleware, [
    body('lead_name').notEmpty().withMessage('Nome do lead é obrigatório'),
    body('date_time').notEmpty().withMessage('Data/hora é obrigatória')
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await appointmentService.create(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  });

  // PUT /api/appointments/:id
  router.put('/:id', authMiddleware, async (req, res, next) => {
    try {
      const result = await appointmentService.update(Number(req.params.id), req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // DELETE /api/appointments/:id
  router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
      const result = await appointmentService.delete(Number(req.params.id));
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/appointments/date/:date
  router.get('/date/:date', authMiddleware, async (req, res, next) => {
    try {
      const appointments = await appointmentService.getByDate(req.params.date);
      res.json(appointments);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/appointments/upcoming
  router.get('/upcoming', authMiddleware, async (req, res, next) => {
    try {
      const appointments = await appointmentService.getUpcoming();
      res.json(appointments);
    } catch (e) {
      next(e);
    }
  });

  return router;
};
