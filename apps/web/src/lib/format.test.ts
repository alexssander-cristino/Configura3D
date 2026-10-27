import { describe, it, expect } from 'vitest';
import { toReais, formatBRL } from './format';

describe('formato monetário', () => {
  it('converte centavos para reais', () => {
    expect(toReais(12345)).toBe(123.45);
    expect(toReais(0)).toBe(0);
    expect(toReais(null)).toBe(0);
    expect(toReais(undefined)).toBe(0);
  });

  it('formata em real brasileiro', () => {
    expect(formatBRL(12345)).toMatch(/R\$\s*123,45/);
    expect(formatBRL(0)).toMatch(/R\$\s*0,00/);
    expect(formatBRL(1000)).toMatch(/R\$\s*10,00/);
  });
});
