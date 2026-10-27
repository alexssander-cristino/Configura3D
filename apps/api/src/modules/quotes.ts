import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'crypto';
import { QuoteCreateInput, QuoteResponse } from '@configura3d/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { calculatePrice } from '../lib/pricing';

const requireAuth = (app: any) => {
  app.addHook('preHandler', async (request: any, reply: any) => {
    if (!request.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Não autenticado', code: 'not_authenticated' });
    }
  });
};

export const quoteRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // POST /quotes — criar orçamento a partir de uma configuração ou produto
  app.post(
    '/quotes',
    {
      schema: {
        body: QuoteCreateInput,
        response: { 201: QuoteResponse, 400: z.any(), 403: z.any(), 404: z.any() },
        tags: ['Quotes'],
      },
    },
    async (request: any, reply) => {
      const { companyId, userId } = request.tenant;
      const { configurationId, productId, quantity = 1, customerName, customerEmail, customerPhone, notes, selections = {} } = request.body;

      const { companyId: tenantId } = request.tenant;

      // Valida produto pertence à empresa
      const product = await prisma.product.findFirst({ where: { id: productId, companyId: tenantId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' });
      }

      let configuration = null;
      if (configurationId) {
        configuration = await prisma.configuration.findFirst({
          where: { id: configurationId, companyId: tenantId },
        });
        if (!configuration) {
          return reply.status(404).send({ error: 'NotFound', message: 'Configuração não encontrada', code: 'configuration_not_found' });
        }
      }

      // Calcula preço válido no backend (fonte da verdade)
      let price;
      try {
        price = await calculatePrice({ productId, quantity, selections }, tenantId);
      } catch (err: any) {
        return reply.status(400).send({ error: 'BadRequest', message: err.message, code: 'price_calculation_failed' });
      }

      const quoteNumber = `Q-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-6)}`;
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

      const quote = await prisma.$transaction(async (tx) => {
        const q = await tx.quote.create({
          data: {
            companyId: tenantId,
            quoteNumber,
            configurationId: configurationId ?? null,
            productId,
            customerName,
            customerEmail,
            customerPhone: customerPhone || null,
            quantity,
            notes: notes || null,
            estimatedValueCents: price.totalCents,
            status: 'draft',
            validUntil,
          },
        });
        await tx.quoteEvent.create({
          data: { quoteId: q.id, type: 'created', toStatus: 'draft', userId: userId || undefined },
        });
        return q;
      });

      logger.info({ userId, companyId: tenantId, quoteId: quote.id, quoteNumber }, 'Orçamento criado');
      return reply.status(201).send({
        id: quote.id,
        companyId: quote.companyId,
        quoteNumber: quote.quoteNumber,
        configurationId: quote.configurationId,
        productId: quote.productId,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        customerPhone: quote.customerPhone,
        quantity: quote.quantity,
        notes: quote.notes,
        estimatedValueCents: quote.estimatedValueCents,
        status: quote.status,
        validUntil: quote.validUntil?.toISOString() ?? null,
        pdfUrl: quote.pdfUrl,
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString(),
      } as any);
    },
  );

  // GET /quotes — listar orçamentos da empresa
  app.get(
    '/quotes',
    {
      schema: {
        querystring: z.object({
          status: z.string().optional(),
          productId: z.string().optional(),
          page: z.coerce.number().min(1).default(1),
          pageSize: z.coerce.number().min(1).max(100).default(20),
        }),
        response: { 200: z.object({ items: z.array(z.any()), total: z.number(), page: z.number(), pageSize: z.number() }) },
        tags: ['Quotes'],
      },
    },
    async (request: any) => {
      const { companyId } = request.tenant;
      const { status, productId, page, pageSize } = request.query;
      const skip = (page - 1) * pageSize;
      const where: any = { companyId };
      if (status) where.status = status;
      if (productId) where.productId = productId;
      const [items, total] = await prisma.$transaction([
        prisma.quote.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: { product: { select: { id: true, name: true, sku: true } } },
        }),
        prisma.quote.count({ where }),
      ]);
      return { items, total, page, pageSize } as any;
    },
  );

  // GET /quotes/:id
  app.get(
    '/quotes/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: QuoteResponse, 403: z.any(), 404: z.any() },
        tags: ['Quotes'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      const quote = await prisma.quote.findFirst({
        where: { id },
        include: {
          configuration: { select: { id: true, shareToken: true, name: true, selections: true, priceSnapshot: true } },
          product: true,
        },
      });
      if (!quote) {
        return reply.status(404).send({ error: 'NotFound', message: 'Orçamento não encontrado', code: 'quote_not_found' } as any);
      }
      if (quote.companyId !== companyId) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem acesso a este orçamento', code: 'no_access' } as any);
      }
      return {
        id: quote.id,
        companyId: quote.companyId,
        quoteNumber: quote.quoteNumber,
        configurationId: quote.configurationId,
        productId: quote.productId,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        customerPhone: quote.customerPhone,
        quantity: quote.quantity,
        notes: quote.notes,
        estimatedValueCents: quote.estimatedValueCents,
        status: quote.status,
        validUntil: quote.validUntil?.toISOString() ?? null,
        pdfUrl: quote.pdfUrl,
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString(),
      } as any;
    },
  );

  // PATCH /quotes/:id/status — mudar status do orçamento
  app.patch(
    '/quotes/:id/status',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']) }),
        response: { 200: QuoteResponse, 403: z.any(), 404: z.any() },
        tags: ['Quotes'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId, userId } = request.tenant;
      const { status } = request.body;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const quote = await prisma.quote.findFirst({ where: { id } });
      if (!quote) {
        return reply.status(404).send({ error: 'NotFound', message: 'Orçamento não encontrado', code: 'quote_not_found' } as any);
      }
      if (quote.companyId !== companyId) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem acesso a este orçamento', code: 'no_access' } as any);
      }
      const updated = await prisma.$transaction(async (tx) => {
        const q = await tx.quote.update({ where: { id }, data: { status } });
        await tx.quoteEvent.create({
          data: { quoteId: q.id, type: 'status_changed', fromStatus: quote.status, toStatus: status, userId: userId || undefined },
        });
        return q;
      });
      logger.info({ userId, companyId, quoteId: id, fromStatus: quote.status, toStatus: status }, 'Status do orçamento alterado');
      return {
        id: updated.id,
        companyId: updated.companyId,
        quoteNumber: updated.quoteNumber,
        configurationId: updated.configurationId,
        productId: updated.productId,
        customerName: updated.customerName,
        customerEmail: updated.customerEmail,
        customerPhone: updated.customerPhone,
        quantity: updated.quantity,
        notes: updated.notes,
        estimatedValueCents: updated.estimatedValueCents,
        status: updated.status,
        validUntil: updated.validUntil?.toISOString() ?? null,
        pdfUrl: updated.pdfUrl,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      } as any;
    },
  );
};
