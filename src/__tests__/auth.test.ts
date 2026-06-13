import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-for-jwt';

function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

describe('Auth Middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('should reject requests without token', () => {
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with malformed auth header', () => {
    req.headers.authorization = 'InvalidHeader';
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with invalid token', () => {
    req.headers.authorization = 'Bearer invalid-token-here';
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept requests with valid token', () => {
    const token = jwt.sign({ login: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    req.headers.authorization = `Bearer ${token}`;
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.login).toBe('testuser');
  });

  it('should reject expired tokens', () => {
    const token = jwt.sign({ login: 'testuser' }, JWT_SECRET, { expiresIn: '0s' });
    req.headers.authorization = `Bearer ${token}`;
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should decode user info from token', () => {
    const user = { login: 'broker123', name: 'João', email: 'joao@email.com' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
    req.headers.authorization = `Bearer ${token}`;
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.login).toBe('broker123');
    expect(req.user.name).toBe('João');
    expect(req.user.email).toBe('joao@email.com');
  });
});
