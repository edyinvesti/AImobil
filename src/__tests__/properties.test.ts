import { describe, it, expect } from 'vitest';
import { normalizeProperty } from '../hooks/useProperties';

describe('Property Normalization', () => {
  it('should handle empty input gracefully', () => {
    const result = normalizeProperty(null as any);
    expect(result.title).toBe('Item Inválido');
    expect(result.id).toBeDefined();
  });

  it('should normalize images from JSON string', () => {
    const input = {
      id: '123',
      images: '["img1.jpg", "img2.jpg"]',
      title: 'Teste'
    };
    const result = normalizeProperty(input);
    expect(Array.isArray(result.images)).toBe(true);
    expect(result.images).toHaveLength(2);
    expect(result.images[0]).toBe('img1.jpg');
  });

  it('should set thumbnail if not provided', () => {
    const input = {
      images: ['img1.jpg'],
      title: 'Teste'
    };
    const result = normalizeProperty(input);
    expect(result.thumbnail).toBe('img1.jpg');
  });

  it('should preserve existing fields', () => {
    const input = {
      title: 'Casa Luxo',
      price: 500000,
      location: 'São Paulo'
    };
    const result = normalizeProperty(input);
    expect(result.title).toBe('Casa Luxo');
    expect(result.price).toBe(500000);
  });
});
