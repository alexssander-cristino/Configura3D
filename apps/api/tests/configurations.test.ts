import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { calculatePrice } from '../src/lib/pricing';

describe('Persistência de configurações', () => {
  let companyId: string;
  let productId: string;
  let groupId: string;
  let optId: string;

  beforeAll(async () => {
    const company = await prisma.company.create({
      data: {
        name: 'Co Teste Config',
        slug: 'co-config-' + Math.random().toString(36).slice(2, 8),
      },
    });
    companyId = company.id;

    const product = await prisma.product.create({
      data: {
        companyId,
        name: 'Produto Config',
        slug: 'prod-config-' + Math.random().toString(36).slice(2, 8),
        category: 'C',
        sku: 'SKU-CFG',
        basePriceCents: 5000,
        isPublished: true,
      },
    });
    productId = product.id;

    const group = await prisma.optionGroup.create({
      data: {
        productId,
        name: 'Acabamento',
        type: 'finish',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 0,
      },
    });
    groupId = group.id;

    const opt = await prisma.productOption.create({
      data: {
        optionGroupId: group.id,
        name: 'Fosco',
        value: 'fosco',
        priceAdditionalCents: 1000,
        isAvailable: true,
        displayOrder: 0,
      },
    });
    optId = opt.id;
  });

  afterAll(async () => {
    await prisma.productOption.deleteMany({ where: { optionGroupId: groupId } });
    await prisma.optionGroup.deleteMany({ where: { id: groupId } });
    await prisma.configuration.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.company.delete({ where: { id: companyId } });
  });

  it('salva configuração com snapshot de preço e permite retomar', async () => {
    const price = await calculatePrice(
      { productId, quantity: 2, selections: { [groupId]: [optId] } },
      companyId,
    );

    const configuration = await prisma.configuration.create({
      data: {
        companyId,
        productId,
        quantity: 2,
        selections: { [groupId]: [optId] },
        priceSnapshot: price,
        isPublic: true,
        shareToken: 'tok-teste-' + Math.random().toString(36).slice(2, 8),
      },
    });

    expect(configuration.id).toBeDefined();
    expect(configuration.companyId).toBe(companyId);
    expect(configuration.quantity).toBe(2);

    // Retorna a configuração salva (simula retomada por link)
    const found = await prisma.configuration.findUnique({ where: { id: configuration.id } });
    expect(found).not.toBeNull();
    expect(found!.priceSnapshot).toEqual(price);
    expect(found!.selections).toEqual({ [groupId]: [optId] });

    // O preço do snapshot está preservado (auditável), independentemente de
    // mudanças futuras na tabela de preços.
    expect((found!.priceSnapshot as any).totalCents).toBe(price.totalCents);
  });

  it('configuração pública é acessível por token sem vínculo de usuário', async () => {
    const token = 'tok-publico-' + Math.random().toString(36).slice(2, 8);
    await prisma.configuration.create({
      data: {
        companyId,
        productId,
        quantity: 1,
        selections: {},
        priceSnapshot: {},
        isPublic: true,
        shareToken: token,
      },
    });

    const publicCfg = await prisma.configuration.findFirst({
      where: { shareToken: token, isPublic: true },
    });
    expect(publicCfg).not.toBeNull();
    expect(publicCfg!.companyId).toBe(companyId);
  });
});
