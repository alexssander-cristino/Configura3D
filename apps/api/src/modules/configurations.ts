import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'crypto';
import {
  ConfigurationSaveInput, ConfigurationResponse, ConfigurationValidateInput,
} from '@configura3d/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { calculatePrice } from '../lib/pricing';

const requireAuth = (app: any) => {
  app.addHook('preHandler', async (request: any, reply: any) => {
    // Link público de configuração não requer autenticação (isPublic é validado na rota)
    if (request.url.startsWith('/api/v1/configurations/share/')) return;
    if (!request.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Não autenticado', code: 'not_authenticated' });
    }
  });
};

export const configurationRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // POST /configurations/validate — valida seleções e calcula preço (não grava)
  app.post(
    '/configurations/validate',
    {
      schema: {
        body: ConfigurationValidateInput,
        response: { 200: z.object({ valid: z.boolean(), price: z.any(), selectedOptions: z.array(z.any()), warnings: z.array(z.string()), errors: z.array(z.string()) }), 403: z.any(), 404: z.any() },
        tags: ['Configurations'],
      },
    },
    async (request: any, reply) => {
      const { companyId } = request.tenant;
      const body = request.body as any;
      const { productId, quantity = 1, selections = {} } = body;
      try {
        const price = await calculatePrice({ productId, quantity, selections }, companyId);
        const valid = price.warnings.filter((w) => !w.startsWith('Grupo')).length === 0;
        return {
          valid,
          price,
          selectedOptions: price.selectedOptions,
          warnings: price.warnings,
          errors: [],
        };
      } catch (err: any) {
        return reply.status(404).send({ error: 'NotFound', message: err.message, code: 'calculation_failed' });
      }
    },
  );

  // POST /configurations — salvar configuração
  app.post(
    '/configurations',
    {
      schema: {
        body: ConfigurationSaveInput,
        response: { 201: ConfigurationResponse, 400: z.any(), 403: z.any(), 404: z.any() },
        tags: ['Configurations'],
      },
    },
    async (request: any, reply) => {
      const { companyId, userId } = request.tenant;
      const body = request.body as any;
      const { productId, quantity = 1, selections = {}, name, isPublic = false } = body;

      const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' });
      }

      // Calcula e valida preço no backend (fonte da verdade)
      let price;
      try {
        price = await calculatePrice({ productId, quantity, selections }, companyId);
      } catch (err: any) {
        return reply.status(400).send({ error: 'BadRequest', message: err.message, code: 'price_calculation_failed' });
      }

      // Versão do produto no momento da gravação (snapshot)
      const productVersion = await prisma.productVersion.findFirst({
        where: { productId },
        orderBy: { version: 'desc' },
      });

      // Pricing version ativa
      const pricingVersion = await prisma.pricingVersion.findFirst({
        where: { companyId, isActive: true },
        orderBy: { effectiveFrom: 'desc' },
      });

      const shareToken = crypto.randomUUID();

      const configuration = await prisma.$transaction(async (tx) => {
        const cfg = await tx.configuration.create({
          data: {
            companyId,
            productId,
            productVersionId: productVersion?.id ?? null,
            userId: userId || undefined,
            shareToken,
            isPublic,
            name: name || null,
            quantity,
            selections,
            priceSnapshot: price as any,
            pricingVersionId: pricingVersion?.id ?? null,
          },
        });
        // Itens de configuração (snapshot detalhado)
        for (const [groupId, optionIds] of Object.entries(selections as Record<string, string[]>)) {
          for (const optionId of optionIds) {
            const option = await tx.productOption.findUnique({ where: { id: optionId } });
            await tx.configurationItem.create({
              data: {
                configurationId: cfg.id,
                optionGroupId: groupId,
                productOptionId: optionId,
                value: option?.value ?? '',
                priceAdditionalCents: option?.priceAdditionalCents ?? 0,
              },
            });
          }
        }
        return cfg;
      });

      logger.info({ userId, companyId, productId, configurationId: configuration.id }, 'Configuração salva');
      return reply.status(201).send({
        id: configuration.id,
        companyId: configuration.companyId,
        productId: configuration.productId,
        shareToken: configuration.shareToken,
        isPublic: configuration.isPublic,
        name: configuration.name,
        quantity: configuration.quantity,
        selections: configuration.selections,
        priceSnapshot: configuration.priceSnapshot,
        pricingVersionId: configuration.pricingVersionId,
        expiresAt: configuration.expiresAt?.toISOString() ?? null,
        createdAt: configuration.createdAt.toISOString(),
        updatedAt: configuration.updatedAt.toISOString(),
      } as any);
    },
  );

  // GET /configurations — listar configurações da empresa
  app.get(
    '/configurations',
    {
      schema: {
        querystring: z.object({
          productId: z.string().optional(),
          isPublic: z.enum(['true', 'false']).optional(),
          page: z.coerce.number().min(1).default(1),
          pageSize: z.coerce.number().min(1).max(100).default(20),
        }),
        response: { 200: z.object({ items: z.array(z.any()), total: z.number(), page: z.number(), pageSize: z.number() }) },
        tags: ['Configurations'],
      },
    },
    async (request: any) => {
      const { companyId } = request.tenant;
      const { productId, isPublic, page, pageSize } = request.query;
      const skip = (page - 1) * pageSize;
      const where: any = { companyId };
      if (productId) where.productId = productId;
      if (isPublic !== undefined) where.isPublic = isPublic === 'true';
      const [items, total] = await prisma.$transaction([
        prisma.configuration.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { updatedAt: 'desc' },
          include: { product: { select: { id: true, name: true, sku: true } } },
        }),
        prisma.configuration.count({ where }),
      ]);
      return { items, total, page, pageSize } as any;
    },
  );

  // GET /configurations/:id
  app.get(
    '/configurations/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: ConfigurationResponse, 403: z.any(), 404: z.any() },
        tags: ['Configurations'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      const configuration = await prisma.configuration.findFirst({
        where: { id },
        include: { items: true },
      });
      if (!configuration) {
        return reply.status(404).send({ error: 'NotFound', message: 'Configuração não encontrada', code: 'configuration_not_found' } as any);
      }
      // Isolamento de tenant: apenas dono ou pública
      if (configuration.companyId !== companyId && !configuration.isPublic) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem acesso a esta configuração', code: 'no_access' } as any);
      }
      return configuration as any;
    },
  );

  // GET /configurations/share/:shareToken — acesso público por link (sem auth)
  app.get(
    '/configurations/share/:shareToken',
    {
      schema: {
        params: z.object({ shareToken: z.string() }),
        response: { 200: z.any(), 403: z.any(), 404: z.any() },
        tags: ['Configurations'],
      },
    },
    async (request, reply) => {
      const { shareToken } = request.params;
      const configuration = await prisma.configuration.findFirst({
        where: { shareToken, isPublic: true },
        include: {
          product: { select: { id: true, name: true, sku: true, basePriceCents: true, modelAsset: { select: { id: true, name: true, fileUrl: true, thumbnailUrl: true } } } },
          items: true,
        },
      });
      if (!configuration) {
        return reply.status(404).send({ error: 'NotFound', message: 'Configuração não encontrada ou não pública', code: 'configuration_not_found' } as any);
      }
      if (configuration.expiresAt && new Date(configuration.expiresAt) < new Date()) {
        return reply.status(410).send({ error: 'Gone', message: 'Link expirado', code: 'link_expired' } as any);
      }
      return {
        id: configuration.id,
        shareToken: configuration.shareToken,
        name: configuration.name,
        product: configuration.product,
        quantity: configuration.quantity,
        selections: configuration.selections,
        priceSnapshot: configuration.priceSnapshot,
        createdAt: configuration.createdAt.toISOString(),
      } as any;
    },
  );

  // PATCH /configurations/:id
  app.patch(
    '/configurations/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: ConfigurationSaveInput.partial(),
        response: { 200: ConfigurationResponse, 403: z.any(), 404: z.any() },
        tags: ['Configurations'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      const configuration = await prisma.configuration.findFirst({ where: { id } });
      if (!configuration) {
        return reply.status(404).send({ error: 'NotFound', message: 'Configuração não encontrada', code: 'configuration_not_found' } as any);
      }
      if (configuration.companyId !== companyId) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem acesso a esta configuração', code: 'no_access' } as any);
      }
      const updated = await prisma.configuration.update({ where: { id }, data: { ...request.body } });
      logger.info({ userId: request.tenant.userId, companyId, configurationId: id }, 'Configuração atualizada');
      return updated as any;
    },
  );

  // DELETE /configurations/:id
  app.delete(
    '/configurations/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.object({ ok: z.boolean() }), 403: z.any(), 404: z.any() },
        tags: ['Configurations'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      const configuration = await prisma.configuration.findFirst({ where: { id } });
      if (!configuration) {
        return reply.status(404).send({ error: 'NotFound', message: 'Configuração não encontrada', code: 'configuration_not_found' } as any);
      }
      if (configuration.companyId !== companyId) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem acesso a esta configuração', code: 'no_access' } as any);
      }
      await prisma.configuration.delete({ where: { id } });
      logger.info({ userId: request.tenant.userId, companyId, configurationId: id }, 'Configuração removida');
      return { ok: true };
    },
  );
};
