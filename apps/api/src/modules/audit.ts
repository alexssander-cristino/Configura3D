import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const requireAuth = (app: any) => {
  app.addHook('preHandler', async (request: any, reply: any) => {
    if (!request.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Não autenticado', code: 'not_authenticated' });
    }
  });
};

export const auditRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // GET /audit/logs — logs de auditoria da empresa
  app.get(
    '/audit/logs',
    {
      schema: {
        querystring: z.object({
          entityType: z.string().optional(),
          entityId: z.string().optional(),
          page: z.coerce.number().min(1).default(1),
          pageSize: z.coerce.number().min(1).max(100).default(50),
        }),
        response: { 200: z.object({ items: z.array(z.any()), total: z.number(), page: z.number(), pageSize: z.number() }) },
        tags: ['Audit'],
      },
    },
    async (request: any) => {
      const { companyId } = request.tenant;
      const { entityType, entityId, page, pageSize } = request.query;
      const skip = (page - 1) * pageSize;
      const where: any = { companyId };
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;
      const [items, total] = await prisma.$transaction([
        prisma.auditLog.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);
      return { items, total, page, pageSize } as any;
    },
  );
};

export const auditLog = async (
  prismaClient: any,
  data: {
    companyId?: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValues?: any;
    newValues?: any;
  },
) => {
  try {
    await prismaClient.auditLog.create({
      data: {
        companyId: data.companyId ?? null,
        userId: data.userId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        oldValues: data.oldValues ?? {},
        newValues: data.newValues ?? {},
      },
    });
  } catch (err) {
    logger.error(err, 'Falha ao gravar log de auditoria');
  }
};
