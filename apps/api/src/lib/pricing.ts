/**
 * Motor de preços do Configura3D.
 *
 * Regras:
 * - Todos os valores em centavos (inteiros) para evitar ponto flutuante.
 * - O cálculo é determinístico: dado o mesmo produto, seleções e versão de
 *   preço, sempre resulta no mesmo total.
 * - O frontend pode calcular um prévia, mas o backend é a fonte da verdade.
 */

import { prisma } from './prisma';
import { MoneyCents } from '@configura3d/shared';

export interface PriceCalculationInput {
  productId: string;
  quantity: number;
  selections: Record<string, string[]>; // optionGroupId -> optionIds[]
  pricingVersionId?: string; // se não informado, usa a versão ativa da empresa
}

export interface OptionPrice {
  optionId: string;
  optionGroupId: string;
  name: string;
  value: string;
  priceAdditionalCents: number;
}

export interface PriceBreakdownResult {
  basePriceCents: number;
  additionalCents: number;
  quantity: number;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  pricingVersionId: string | null;
  selectedOptions: OptionPrice[];
  warnings: string[];
}

/** Calcula o preço de uma configuração. Não grava nada no banco. */
export const calculatePrice = async (
  input: PriceCalculationInput,
  companyId: string,
): Promise<PriceBreakdownResult> => {
  const { productId, quantity = 1, selections = {}, pricingVersionId } = input;

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product || product.companyId !== companyId) {
    throw new Error('Produto não encontrado');
  }
  if (product.isArchived) {
    throw new Error('Produto está arquivado');
  }

  // Determina versão de preço ativa (padrão: a mais recente ativa da empresa)
  let pricingVersion = pricingVersionId
    ? await prisma.pricingVersion.findUnique({ where: { id: pricingVersionId } })
    : null;
  if (!pricingVersion || pricingVersion.companyId !== companyId) {
    pricingVersion = await prisma.pricingVersion.findFirst({
      where: { companyId, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  const taxRate = pricingVersion?.taxRateCents ?? 0; // percentual em centavos (ex: 1000 = 10%)
  const basePriceCents = product.basePriceCents;

  // Busca os grupos de opção e opções selecionadas
  const groupIds = Object.keys(selections);
  const optionGroups = await prisma.optionGroup.findMany({
    where: { productId, id: { in: groupIds } },
    include: { options: true },
  });
  const groupById = new Map(optionGroups.map((g) => [g.id, g]));

  const selectedOptions: OptionPrice[] = [];
  let additionalCents = 0;
  const warnings: string[] = [];

  for (const groupId of groupIds) {
    const group = groupById.get(groupId);
    if (!group) {
      warnings.push(`Grupo de opção ${groupId} não encontrado`);
      continue;
    }
    const chosen = selections[groupId] || [];
    if (chosen.length < group.minSelections) {
      warnings.push(`Grupo "${group.name}" requer pelo menos ${group.minSelections} seleção(ões)`);
    }
    if (chosen.length > group.maxSelections) {
      warnings.push(`Grupo "${group.name}" permite no máximo ${group.maxSelections} seleção(ões)`);
    }
    for (const optionId of chosen) {
      const option = group.options.find((o) => o.id === optionId);
      if (!option) {
        warnings.push(`Opção ${optionId} não encontrada no grupo "${group.name}"`);
        continue;
      }
      if (!option.isAvailable) {
        warnings.push(`Opção "${option.name}" indisponível`);
      }
      if (option.isDiscontinued) {
        warnings.push(`Opção "${option.name}" descontinuada`);
      }
      selectedOptions.push({
        optionId: option.id,
        optionGroupId: group.id,
        name: option.name,
        value: option.value,
        priceAdditionalCents: option.priceAdditionalCents,
      });
      additionalCents += option.priceAdditionalCents;
    }
  }

  const subtotalCents = (basePriceCents + additionalCents) * quantity;
  const taxCents = Math.round((subtotalCents * taxRate) / 10000); // taxRate em centavos de percentual
  const discountCents = 0; // descontos autorizados são aplicados em versão futura
  const totalCents = Math.max(0, subtotalCents + taxCents - discountCents);

  return {
    basePriceCents,
    additionalCents,
    quantity,
    subtotalCents,
    taxCents,
    discountCents,
    totalCents,
    currency: 'BRL',
    pricingVersionId: pricingVersion?.id ?? null,
    selectedOptions,
    warnings,
  };
};
