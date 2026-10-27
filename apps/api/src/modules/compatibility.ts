import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { CompatibilityRuleCreateInput, CompatibilityRuleResponse } from '@configura3d/shared';
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

export const compatibilityRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // GET /products/:productId/compatibility-rules
  app.get(
    '/products/:productId/compatibility-rules',
    {
      schema: {
        params: z.object({ productId: z.string() }),
        response: { 200: z.array(CompatibilityRuleResponse), 403: z.any(), 404: z.any() },
        tags: ['Compatibility'],
      },
    },
    async (request: any, reply) => {
      const { productId } = request.params;
      const { companyId } = request.tenant;
      const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' });
      }
      return prisma.compatibilityRule.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
      });
    },
  );

  // POST /products/:productId/compatibility-rules
  app.post(
    '/products/:productId/compatibility-rules',
    {
      schema: {
        params: z.object({ productId: z.string() }),
        body: CompatibilityRuleCreateInput,
        response: { 201: CompatibilityRuleResponse, 403: z.any(), 404: z.any() },
        tags: ['Compatibility'],
      },
    },
    async (request: any, reply) => {
      const { productId } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' } as any);
      }
      const rule = await prisma.compatibilityRule.create({
        data: { ...request.body, productId },
      });
      logger.info({ userId: request.tenant.userId, companyId, productId, ruleId: rule.id }, 'Regra de compatibilidade criada');
      return reply.status(201).send(rule as any);
    },
  );

  // DELETE /compatibility-rules/:id
  app.delete(
    '/compatibility-rules/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.object({ ok: z.boolean() }), 403: z.any(), 404: z.any() },
        tags: ['Compatibility'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const rule = await prisma.compatibilityRule.findFirst({
        where: { id },
        include: { product: true },
      });
      if (!rule || rule.product.companyId !== companyId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Regra não encontrada', code: 'rule_not_found' } as any);
      }
      await prisma.compatibilityRule.delete({ where: { id } });
      logger.info({ userId: request.tenant.userId, companyId, ruleId: id }, 'Regra de compatibilidade removida');
      return { ok: true };
    },
  );
};
