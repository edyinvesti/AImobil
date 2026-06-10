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
  body('login').isString().notEmpty().withMessage('Login é obrigatório'),
  body('password').isString().isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
  validate
];

const validateRegister = [
  body('login').isString().notEmpty().withMessage('Login é obrigatório'),
  body('password').isString().isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('name').isString().notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  validate
];

const validateProperty = [
  body('title').isString().notEmpty().withMessage('Título é obrigatório'),
  body('price').isNumeric().withMessage('Preço deve ser numérico'),
  body('type').isIn(['apartamento', 'casa', 'terreno', 'comercial', 'rural']).withMessage('Tipo inválido'),
  validate
];

const validateLead = [
  body('name').isString().notEmpty().withMessage('Nome é obrigatório'),
  body('phone').isString().notEmpty().withMessage('Telefone é obrigatório'),
  validate
];

module.exports = { 
  validate, 
  validateLogin, 
  validateRegister, 
  validateProperty, 
  validateLead 
};
