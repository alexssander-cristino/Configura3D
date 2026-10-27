import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { calculatePrice } from '../src/lib/pricing';

describe('Motor de preços', () => {
  let companyId: string;
  let productId: string;
  let groupId: string;
  let optBaseId: string;
  let optAddId: string;

  beforeAll(async () => {
    const company = await prisma.company.create({
      data: {
        name: 'Co Teste Preço',
        slug: 'co-preco-' + Math.random().toString(36).slice(2, 8),
      },
    });
    companyId = company.id;

    const product = await prisma.product.create({
      data: {
        companyId,
        name: 'Produto Teste',
        slug: 'prod-teste-' + Math.random().toString(36).slice(2, 8),
        category: 'C',
        sku: 'SKU-TEST',
        basePriceCents: 10000, // R$ 100,00
        isPublished: true,
      },
    });
    productId = product.id;

    const group = await prisma.optionGroup.create({
      data: {
        productId,
        name: 'Cor',
        type: 'color',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 0,
      },
    });
    groupId = group.id;

    const optBase = await prisma.productOption.create({
      data: {
        optionGroupId: group.id,
        name: 'Padrão',
        value: 'padrao',
        priceAdditionalCents: 0,
        isAvailable: true,
        displayOrder: 0,
      },
    });
    optBaseId = optBase.id;

    const optAdd = await prisma.productOption.create({
      data: {
        optionGroupId: group.id,
        name: 'Acrescento',
        value: 'acrescento',
        priceAdditionalCents: 2000, // R$ 20,00
        isAvailable: true,
        displayOrder: 1,
      },
    });
    optAddId = optAdd.id;

    await prisma.pricingVersion.create({
      data: {
        companyId,
        version: 1,
        effectiveFrom: new Date(),
        taxRateCents: 1000, // 10%
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.productOption.deleteMany({ where: { optionGroupId: groupId } });
    await prisma.optionGroup.deleteMany({ where: { id: groupId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.pricingVersion.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
  });

  it('calcula preço base sem adicionais', async () => {
    const price = await calculatePrice(
      { productId, quantity: 1, selections: { [groupId]: [optBaseId] } },
      companyId,
    );
    expect(price.basePriceCents).toBe(10000);
    expect(price.additionalCents).toBe(0);
    expect(price.subtotalCents).toBe(10000);
    expect(price.taxCents).toBe(1000); // 10% de 10000
    expect(price.totalCents).toBe(11000); // R$ 110,00
  });

  it('soma adicional da opção selecionada', async () => {
    const price = await calculatePrice(
      { productId, quantity: 1, selections: { [groupId]: [optAddId] } },
      companyId,
    );
    expect(price.additionalCents).toBe(2000);
    expect(price.subtotalCents).toBe(12000);
    expect(price.totalCents).toBe(13200); // (10000+2000) * 1.10
  });

  it('multiplica pela quantidade', async () => {
    const price = await calculatePrice(
      { productId, quantity: 3, selections: { [groupId]: [optBaseId] } },
      companyId,
    );
    expect(price.subtotalCents).toBe(30000);
    expect(price.totalCents).toBe(33000);
  });

  it('arredonda valores monetários sem ponto flutuante (inteiros)', async () => {
    const price = await calculatePrice(
      { productId, quantity: 1, selections: { [groupId]: [optAddId] } },
      companyId,
    );
    expect(Number.isInteger(price.totalCents)).toBe(true);
    expect(price.totalCents).toBe(13200);
  });
});
