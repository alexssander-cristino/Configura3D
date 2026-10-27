/**
 * Utilitários de valores monetários.
 *
 * Estratégia: todos os valores são armazenados e manipulados como inteiros
 * em centavos (ex: R$ 123,45 = 12345). Isso elimina erros de ponto flutuante.
 * O frontend exibe formatado, mas o preço definitivo é sempre recalculado e
 * validado pelo backend.
 */

export const CENTS_PER_UNIT = 100;
export const CURRENCY = 'BRL';
export const CURRENCY_SYMBOL = 'R$';

/** Converte reais (ex: 123.45) para centavos (12345). */
export const toCents = (value: number): number => Math.round(value * CENTS_PER_UNIT);

/** Converte centavos para reais (12345 -> 123.45). */
export const toReais = (cents: number): number => cents / CENTS_PER_UNIT;

/** Formata centavos para string em real (R$ 123,45). */
export const formatBRL = (cents: number): string => {
  const reais = toReais(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
};

/** Soma segura de centavos. */
export const sumCents = (...values: number[]): number =>
  values.reduce((acc, v) => acc + (v || 0), 0);

/** Garante que um valor monetário seja inteiro não negativo. */
export const asCents = (value: number): number => {
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  return rounded;
};
