/**
 * Configura3D - Seed de demonstração.
 *
 * Cria uma empresa, um usuário, um produto com modelo 3D de demonstração,
 * componentes mapeados, grupos de opção, opções com preços, regras de
 * compatibilidade e uma versão de preço ativa.
 *
 * Execute:  cd apps/api && npx tsx scripts/seed-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Empresa
  const company = await prisma.company.upsert({
    where: { slug: 'empresa-demo' },
    update: {},
    create: {
      name: 'Empresa Demo',
      slug: 'empresa-demo',
      domain: null,
      settings: { theme: { primaryColor: '#0f172a', accentColor: '#2563eb' } },
      isActive: true,
    },
  });
  console.log('Empresa:', company.id, company.name);

  // 2. Usuário dono
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@configura3d.com' },
    update: {},
    create: {
      email: 'demo@configura3d.com',
      passwordHash,
      name: 'Usuário Demo',
      role: 'owner',
      isActive: true,
    },
  });
  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    update: {},
    create: {
      companyId: company.id,
      userId: user.id,
      role: 'owner',
      permissions: [],
    },
  });
  console.log('Usuário:', user.id, user.email);

  // 3. Modelo 3D (arquivo GLB servido pelo frontend em /models/demo-organizador.glb)
  const modelAsset = await prisma.modelAsset.upsert({
    where: { id: 'demo-model-asset' },
    update: {},
    create: {
      id: 'demo-model-asset',
      companyId: company.id,
      name: 'Organizador de Mesa - Demo',
      description: 'Modelo de demonstração com componentes nomeados (base, gaveta, prateleira).',
      fileUrl: '/models/demo-organizador.glb',
      thumbnailUrl: null,
      mimeType: 'model/gltf-binary',
      sizeBytes: 5668,
      processingStatus: 'ready',
      errorMessage: null,
      metadata: {
        dimensions: { width: 1.2, height: 0.9, depth: 0.9 },
        scale: 1,
        components: ['base', 'gaveta', 'prateleira'],
      },
    },
  });
  console.log('Modelo:', modelAsset.id, modelAsset.processingStatus);

  // 4. Componentes do modelo (mapeamento mesh -> componente configurável)
  const compBase = await prisma.modelComponent.create({
    data: {
      modelAssetId: modelAsset.id,
      name: 'Base',
      meshName: 'base',
      materialSlot: 'base-material',
      type: 'color',
      isConfigurable: true,
      displayOrder: 0,
    },
  });
  const compGaveta = await prisma.modelComponent.create({
    data: {
      modelAssetId: modelAsset.id,
      name: 'Gaveta',
      meshName: 'gaveta',
      materialSlot: 'gaveta-material',
      type: 'material',
      isConfigurable: true,
      displayOrder: 1,
    },
  });
  const compPrateleira = await prisma.modelComponent.create({
    data: {
      modelAssetId: modelAsset.id,
      name: 'Prateleira',
      meshName: 'prateleira',
      materialSlot: 'prateleira-material',
      type: 'finish',
      isConfigurable: true,
      displayOrder: 2,
    },
  });
  console.log('Componentes:', compBase.id, compGaveta.id, compPrateleira.id);

  // 5. Produto
  const product = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Organizador de Mesa (Demo)',
      description:
        'Organizador de mesa de madeira com componentes configuráveis. Modelo de demonstração.',
      slug: 'organizador-de-mesa-demo',
      category: 'Móveis',
      sku: 'ORG-MESA-001',
      basePriceCents: 34900, // R$ 349,00
      productionTimeDays: 7,
      modelAssetId: modelAsset.id,
      isPublished: true,
      isArchived: false,
      settings: {},
    },
  });
  console.log('Produto:', product.id, product.slug, 'R$', product.basePriceCents / 100);

  // 6. Grupos de opção
  const groupCorBase = await prisma.optionGroup.create({
    data: {
      productId: product.id,
      name: 'Cor da Base',
      type: 'color',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      displayOrder: 0,
    },
  });
  const groupMaterialGaveta = await prisma.optionGroup.create({
    data: {
      productId: product.id,
      name: 'Material da Gaveta',
      type: 'material',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      displayOrder: 1,
    },
  });
  const groupAcabamentoPrateleira = await prisma.optionGroup.create({
    data: {
      productId: product.id,
      name: 'Acabamento da Prateleira',
      type: 'finish',
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      displayOrder: 2,
    },
  });
  console.log('Grupos de opção criados');

  // 7. Opções (com preços adicionais)
  const optBaseClaro = await prisma.productOption.create({
    data: {
      optionGroupId: groupCorBase.id,
      name: 'Madeira Clara',
      value: 'madeira-clara',
      priceAdditionalCents: 0,
      isAvailable: true,
      isDiscontinued: false,
      metadata: { color: '#8d6e63' },
      displayOrder: 0,
    },
  });
  const optBaseEscuro = await prisma.productOption.create({
    data: {
      optionGroupId: groupCorBase.id,
      name: 'Madeira Escura',
      value: 'madeira-escura',
      priceAdditionalCents: 4000, // R$ 40,00
      isAvailable: true,
      metadata: { color: '#3e2723' },
      displayOrder: 1,
    },
  });
  const optGavetaMadeira = await prisma.productOption.create({
    data: {
      optionGroupId: groupMaterialGaveta.id,
      name: 'Gaveta em Madeira',
      value: 'gaveta-madeira',
      priceAdditionalCents: 0,
      isAvailable: true,
      metadata: { color: '#5d4037' },
      displayOrder: 0,
    },
  });
  const optGavetaMetal = await prisma.productOption.create({
    data: {
      optionGroupId: groupMaterialGaveta.id,
      name: 'Gaveta em Metal',
      value: 'gaveta-metal',
      priceAdditionalCents: 6000, // R$ 60,00
      isAvailable: true,
      metadata: { color: '#90a4ae' },
      displayOrder: 1,
    },
  });
  const optPrateleiraLaca = await prisma.productOption.create({
    data: {
      optionGroupId: groupAcabamentoPrateleira.id,
      name: 'Prateleira Laqueada',
      value: 'prateleira-laca',
      priceAdditionalCents: 2500, // R$ 25,00
      isAvailable: true,
      metadata: { finish: 'laca' },
      displayOrder: 0,
    },
  });
  const optPrateleiraNatural = await prisma.productOption.create({
    data: {
      optionGroupId: groupAcabamentoPrateleira.id,
      name: 'Prateleira Natural',
      value: 'prateleira-natural',
      priceAdditionalCents: 0,
      isAvailable: true,
      metadata: { finish: 'natural' },
      displayOrder: 1,
    },
  });
  console.log('Opções criadas');

  // 8. Regras de compatibilidade
  // Madeira escura é incompatível com gaveta de metal (exemplo de negócio)
  await prisma.compatibilityRule.create({
    data: {
      productId: product.id,
      name: 'Madeira escura não combina com gaveta metal',
      type: 'incompatible',
      condition: { optionGroupId: groupCorBase.id, optionId: optBaseEscuro.id },
      action: { blockOptionGroupId: groupMaterialGaveta.id, blockOptionId: optGavetaMetal.id },
      isActive: true,
    },
  });

  // 9. Versão de preço ativa (taxa 0%, sem desconto)
  await prisma.pricingVersion.create({
    data: {
      companyId: company.id,
      version: 1,
      effectiveFrom: new Date('2026-01-01'),
      taxRateCents: 0,
      discountRules: [],
      snapshot: { note: 'Versão inicial de demonstração' },
      isActive: true,
    },
  });
  console.log('Versão de preço criada');
  console.log('SEED CONCLUÍDO com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
