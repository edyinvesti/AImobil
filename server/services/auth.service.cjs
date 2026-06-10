// server/services/auth.service.cjs
// Serviço de autenticação (login, registro, JWT)

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'aimobil-jwt-secret-2024';
const JWT_EXPIRES_IN = '24h';

class AuthService {
  constructor(dataEngine) {
    this.dataEngine = dataEngine;
  }

  generateToken(user) {
    return jwt.sign(
      { login: user.login, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  async login(login, password) {
    const user = await this.dataEngine.validateUser(login);
    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    // Em produção, usar bcrypt.compare
    if (user.password !== password) {
      throw new UnauthorizedError('Senha incorreta');
    }

    const token = this.generateToken(user);
    logger.info('User logged in', { login: user.login });

    return {
      token,
      user: {
        login: user.login,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    };
  }

  async register(userData) {
    const existingUser = await this.dataEngine.validateUser(userData.login);
    if (existingUser) {
      throw new ConflictError('Usuário já existe');
    }

    const user = await this.dataEngine.createUser({
      login: userData.login,
      password: userData.password, // Em produção, usar bcrypt.hash
      name: userData.name,
      email: userData.email,
      phone: userData.phone || ''
    });

    const token = this.generateToken(userData);
    logger.info('User registered', { login: userData.login });

    return {
      token,
      user: {
        login: userData.login,
        name: userData.name,
        email: userData.email
      }
    };
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = AuthService;
