import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PriceCalculateInput, PriceCalculateOutput } from '@configura3d/shared';
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

export const pricingRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // POST /pricing/calculate — calcular preço de uma configuração (fonte da verdade)
  app.post(
    '/pricing/calculate',
    {
      schema: {
        body: PriceCalculateInput,
        response: { 200: PriceCalculateOutput, 400: z.any(), 403: z.any(), 404: z.any() },
        tags: ['Pricing'],
      },
    },
    async (request: any, reply) => {
      const { companyId } = request.tenant;
      const { productId, quantity = 1, selections = {} } = request.body;
      try {
        const price = await calculatePrice({ productId, quantity, selections }, companyId);
        return {
          basePriceCents: price.basePriceCents,
          additionalCents: price.additionalCents,
          quantity: price.quantity,
          subtotalCents: price.subtotalCents,
          taxCents: price.taxCents,
          discountCents: price.discountCents,
          totalCents: price.totalCents,
          currency: price.currency,
          pricingVersionId: price.pricingVersionId,
          breakdown: price.selectedOptions.map((o) => ({
            optionId: o.optionId,
            optionGroupId: o.optionGroupId,
            name: o.name,
            value: o.value,
            priceAdditionalCents: o.priceAdditionalCents,
          })),
          warnings: price.warnings,
        };
      } catch (err: any) {
        return reply.status(404).send({ error: 'NotFound', message: err.message, code: 'calculation_failed' });
      }
    },
  );

  // GET /pricing/versions — versões de preço da empresa
  app.get(
    '/pricing/versions',
    {
      schema: {
        querystring: z.object({ active: z.enum(['true', 'false']).optional() }),
        response: { 200: z.array(z.any()) },
        tags: ['Pricing'],
      },
    },
    async (request: any) => {
      const { companyId } = request.tenant;
      const { active } = request.query;
      const where: any = { companyId };
      if (active !== undefined) where.isActive = active === 'true';
      return prisma.pricingVersion.findMany({ where, orderBy: { effectiveFrom: 'desc' } });
    },
  );

  // POST /pricing/versions — criar nova versão de preço (snapshot)
  app.post(
    '/pricing/versions',
    {
      schema: {
        body: z.object({
          version: z.number().int().positive().default(1),
          effectiveFrom: z.string().datetime().optional(),
          taxRateCents: z.number().int().nonnegative().default(0),
          discountRules: z.array(z.any()).default([]),
          snapshot: z.record(z.any()).default({}),
          isActive: z.boolean().default(true),
        }),
        response: { 201: z.any(), 403: z.any() },
        tags: ['Pricing'],
      },
    },
    async (request: any, reply) => {
      const { companyId } = request.tenant;
      if (!['owner', 'admin'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' });
      }
      // Se ativar, desativa as anteriores
      if (request.body.isActive) {
        await prisma.pricingVersion.updateMany({ where: { companyId }, data: { isActive: false } });
      }
      const pv = await prisma.pricingVersion.create({
        data: {
          companyId,
          version: request.body.version,
          effectiveFrom: request.body.effectiveFrom ? new Date(request.body.effectiveFrom) : new Date(),
          taxRateCents: request.body.taxRateCents,
          discountRules: request.body.discountRules,
          snapshot: request.body.snapshot,
          isActive: request.body.isActive,
        },
      });
      logger.info({ userId: request.tenant.userId, companyId, pricingVersionId: pv.id }, 'Versão de preço criada');
      return reply.status(201).send(pv);
    },
  );
};
