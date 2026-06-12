// server/middleware/error.middleware.cjs
const path = require('path');
const logger = require(path.join(__dirname, '..', 'utils', 'logger.cjs'));

function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack });
  
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  
  res.status(status).json({ 
    error: message,
    success: false 
  });
}

// Middleware para rotas não encontradas
function notFound(req, res) {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    success: false 
  });
}

module.exports = { errorHandler, notFound };
