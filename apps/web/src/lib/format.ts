/**
 * Formatação de valores monetários (centavos -> real).
 * O backend é a fonte da verdade; aqui apenas exibimos.
 */

export const toReais = (cents: number | null | undefined): number =>
  (cents ?? 0) / 100;

export const formatBRL = (cents: number | null | undefined): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toReais(cents));
};

export const formatPercent = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 0 }).format(value / 100);
