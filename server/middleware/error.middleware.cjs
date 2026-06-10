// server/middleware/error.middleware.cjs

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error(err.stack);
  
  const status = err.status || 500;
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
