// server/middleware/auth.middleware.cjs
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'iamobil-secret-change-in-production';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { login, creci, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function generateToken(user) {
  return jwt.sign(
    { login: user.login, creci: user.creci },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
