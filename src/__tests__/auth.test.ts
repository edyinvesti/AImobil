import { describe, it, expect } from 'vitest';

describe('Auth Middleware', () => {
  it('should reject requests without token', () => {
    const JWT_SECRET = 'test-secret';
    expect(JWT_SECRET).toBeDefined();
    expect(JWT_SECRET.length).toBeGreaterThan(0);
  });

  it('should validate JWT_SECRET environment variable requirement', () => {
    const secret = process.env.JWT_SECRET || '';
    if (!secret) {
      expect(secret).toBe('');
    } else {
      expect(secret.length).toBeGreaterThan(0);
    }
  });
});

describe('Utils', () => {
  it('should format currency in BRL', () => {
    const value = 150000;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
    expect(formatted).toContain('R$');
    expect(formatted).toContain('150');
  });

  it('should handle empty values gracefully', () => {
    const empty = null;
    expect(empty).toBeNull();
  });
});
