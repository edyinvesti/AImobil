// server/services/auth.service.cjs
// Serviço de autenticação (login, registro, JWT)

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { UnauthorizedError, ConflictError } = require(path.join(__dirname, '..', 'utils', 'errors.cjs'));
const logger = require(path.join(__dirname, '..', 'utils', 'logger.cjs'));

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET não configurado no .env — servidor não pode iniciar');
  process.exit(1);
}
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
    const user = await this.dataEngine.validateBroker(login);
    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch {
      passwordMatch = false;
    }

    if (!passwordMatch && user.password === password) {
      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await this.dataEngine.client.execute({
        sql: 'UPDATE brokers SET password = ? WHERE rowid = ?',
        args: [hashed, user.rowid]
      });
      passwordMatch = true;
    }

    if (!passwordMatch) {
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
    const existingUser = await this.dataEngine.validateBroker(userData.login);
    if (existingUser) {
      throw new ConflictError('Usuário já existe');
    }

    const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
    await this.dataEngine.createBroker({
      login: userData.login,
      password: hashedPassword,
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
