import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ProductCreateInput, ProductUpdateInput, ProductResponse, ProductListItem,
} from '@configura3d/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const requireAuth = (app: any) => {
  app.addHook('preHandler', async (request: any, reply: any) => {
    if (!request.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Não autenticado', code: 'not_authenticated' });
    }
  });
};

const requireEditor = (app: any) => {
  app.addHook('preHandler', async (request: any, reply: any) => {
    if (!request.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Não autenticado', code: 'not_authenticated' });
    }
    if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' });
    }
  });
};

export const productRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // GET /products — listar produtos da empresa
  app.get(
    '/products',
    {
      schema: {
        querystring: z.object({
          category: z.string().optional(),
          search: z.string().optional(),
          isPublished: z.enum(['true', 'false']).optional(),
          isArchived: z.enum(['true', 'false']).optional().default('false'),
          page: z.coerce.number().min(1).default(1),
          pageSize: z.coerce.number().min(1).max(100).default(20),
        }),
        response: { 200: z.object({ items: z.array(ProductListItem), total: z.number(), page: z.number(), pageSize: z.number() }) },
        tags: ['Products'],
      },
    },
    async (request: any) => {
      const { companyId } = request.tenant;
      const { category, search, isPublished, isArchived, page, pageSize } = request.query;
      const skip = (page - 1) * pageSize;
      const where: any = {
        companyId,
        isArchived: isArchived === 'true',
      };
      if (category) where.category = category;
      if (isPublished !== undefined) where.isPublished = isPublished === 'true';
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }
      const [items, total] = await prisma.$transaction([
        prisma.product.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { updatedAt: 'desc' },
          include: { modelAsset: { select: { id: true, name: true, processingStatus: true, thumbnailUrl: true } } },
        }),
        prisma.product.count({ where }),
      ]);
      return { items, total, page, pageSize } as any;
    },
  );

  // POST /products — criar produto
  app.post(
    '/products',
    {
      schema: {
        body: ProductCreateInput,
        response: { 201: ProductResponse, 403: z.any(), 409: z.any() },
        tags: ['Products'],
      },
    },
    async (request: any, reply) => {
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const { slug, sku } = request.body;
      const exists = await prisma.product.findFirst({
        where: { companyId, OR: [{ slug }, { sku }] },
      });
      if (exists) {
        return reply.status(409).send({ error: 'Conflict', message: 'Slug ou SKU já existe nesta empresa', code: 'duplicate' } as any);
      }
      const product = await prisma.product.create({
        data: {
          ...request.body,
          companyId,
          basePriceCents: request.body.basePriceCents,
          modelAssetId: request.body.modelAssetId || null,
          settings: request.body.settings || {},
        },
      });
      logger.info({ userId: request.tenant.userId, companyId, productId: product.id }, 'Produto criado');
      return reply.status(201).send(product as any);
    },
  );

  // GET /products/:id
  app.get(
    '/products/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: ProductResponse, 403: z.any(), 404: z.any() },
        tags: ['Products'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      const product = await prisma.product.findFirst({ where: { id, companyId }, include: { modelAsset: true } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' } as any);
      }
      return product as any;
    },
  );

  // PATCH /products/:id
  app.patch(
    '/products/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: ProductUpdateInput,
        response: { 200: ProductResponse, 403: z.any(), 404: z.any() },
        tags: ['Products'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const product = await prisma.product.findFirst({ where: { id, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' } as any);
      }
      const updated = await prisma.product.update({ where: { id }, data: request.body });
      logger.info({ userId: request.tenant.userId, companyId, productId: id }, 'Produto atualizado');
      return updated as any;
    },
  );

  // DELETE /products/:id (arquiva lógico)
  app.delete(
    '/products/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.object({ ok: z.boolean() }), 403: z.any(), 404: z.any() },
        tags: ['Products'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const product = await prisma.product.findFirst({ where: { id, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' } as any);
      }
      await prisma.product.update({ where: { id }, data: { isArchived: true } });
      logger.info({ userId: request.tenant.userId, companyId, productId: id }, 'Produto arquivado');
      return { ok: true };
    },
  );

  // POST /products/:id/publish
  app.post(
    '/products/:id/publish',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: ProductResponse, 403: z.any(), 404: z.any() },
        tags: ['Products'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const product = await prisma.product.findFirst({ where: { id, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' } as any);
      }
      const updated = await prisma.product.update({ where: { id }, data: { isPublished: true, isArchived: false } });
      logger.info({ userId: request.tenant.userId, companyId, productId: id }, 'Produto publicado');
      return updated as any;
    },
  );

  // POST /products/:id/archive
  app.post(
    '/products/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: ProductResponse, 403: z.any(), 404: z.any() },
        tags: ['Products'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const product = await prisma.product.findFirst({ where: { id, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' } as any);
      }
      const updated = await prisma.product.update({ where: { id }, data: { isArchived: true, isPublished: false } });
      logger.info({ userId: request.tenant.userId, companyId, productId: id }, 'Produto arquivado');
      return updated as any;
    },
  );

  // POST /products/:id/duplicate
  app.post(
    '/products/:id/duplicate',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 201: ProductResponse, 403: z.any(), 404: z.any() },
        tags: ['Products'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const product = await prisma.product.findFirst({ where: { id, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' } as any);
      }
      const dup = await prisma.product.create({
        data: {
          name: `${product.name} (Cópia)`,
          description: product.description,
          slug: `${product.slug}-copia`,
          category: product.category,
          sku: `${product.sku}-C`,
          basePriceCents: product.basePriceCents,
          productionTimeDays: product.productionTimeDays,
          modelAssetId: product.modelAssetId,
          isPublished: false,
          isArchived: false,
          settings: (product.settings as any) ?? {},
          companyId,
        },
      });
      logger.info({ userId: request.tenant.userId, companyId, productId: id, duplicateId: dup.id }, 'Produto duplicado');
      return reply.status(201).send(dup as any);
    },
  );
};
