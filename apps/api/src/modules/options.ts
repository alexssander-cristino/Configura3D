import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  OptionGroupCreateInput, OptionGroupResponse,
  ProductOptionCreateInput, ProductOptionResponse,
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

export const optionRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // GET /products/:productId/option-groups
  app.get(
    '/products/:productId/option-groups',
    {
      schema: {
        params: z.object({ productId: z.string() }),
        response: { 200: z.array(OptionGroupResponse), 403: z.any(), 404: z.any() },
        tags: ['Options'],
      },
    },
    async (request: any, reply) => {
      const { productId } = request.params;
      const { companyId } = request.tenant;
      const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
      if (!product) {
        return reply.status(404).send({ error: 'NotFound', message: 'Produto não encontrado', code: 'product_not_found' });
      }
      return prisma.optionGroup.findMany({
        where: { productId },
        include: { options: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { displayOrder: 'asc' },
      });
    },
  );

  // POST /products/:productId/option-groups
  app.post(
    '/products/:productId/option-groups',
    {
      schema: {
        params: z.object({ productId: z.string() }),
        body: OptionGroupCreateInput,
        response: { 201: OptionGroupResponse, 403: z.any(), 404: z.any() },
        tags: ['Options'],
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
      const count = await prisma.optionGroup.count({ where: { productId } });
      const group = await prisma.optionGroup.create({
        data: { ...request.body, productId, displayOrder: request.body.displayOrder ?? count },
        include: { options: true },
      });
      logger.info({ userId: request.tenant.userId, companyId, productId, groupId: group.id }, 'Grupo de opções criado');
      return reply.status(201).send(group as any);
    },
  );

  // GET /option-groups/:id
  app.get(
    '/option-groups/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: OptionGroupResponse, 403: z.any(), 404: z.any() },
        tags: ['Options'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      const group = await prisma.optionGroup.findFirst({
        where: { id },
        include: { product: true, options: { orderBy: { displayOrder: 'asc' } } },
      });
      if (!group || group.product.companyId !== companyId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Grupo de opções não encontrado', code: 'group_not_found' } as any);
      }
      return group as any;
    },
  );

  // PATCH /option-groups/:id
  app.patch(
    '/option-groups/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: OptionGroupCreateInput.partial(),
        response: { 200: OptionGroupResponse, 403: z.any(), 404: z.any() },
        tags: ['Options'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const group = await prisma.optionGroup.findFirst({
        where: { id },
        include: { product: true },
      });
      if (!group || group.product.companyId !== companyId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Grupo de opções não encontrado', code: 'group_not_found' } as any);
      }
      const updated = await prisma.optionGroup.update({ where: { id }, data: request.body });
      logger.info({ userId: request.tenant.userId, companyId, groupId: id }, 'Grupo de opções atualizado');
      return updated as any;
    },
  );

  // DELETE /option-groups/:id
  app.delete(
    '/option-groups/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.object({ ok: z.boolean() }), 403: z.any(), 404: z.any() },
        tags: ['Options'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const group = await prisma.optionGroup.findFirst({
        where: { id },
        include: { product: true },
      });
      if (!group || group.product.companyId !== companyId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Grupo de opções não encontrado', code: 'group_not_found' } as any);
      }
      await prisma.optionGroup.delete({ where: { id } });
      logger.info({ userId: request.tenant.userId, companyId, groupId: id }, 'Grupo de opções removido');
      return { ok: true };
    },
  );

  // POST /option-groups/:id/options
  app.post(
    '/option-groups/:id/options',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: ProductOptionCreateInput,
        response: { 201: ProductOptionResponse, 403: z.any(), 404: z.any() },
        tags: ['Options'],
      },
    },
    async (request: any, reply) => {
      const { id: groupId } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const group = await prisma.optionGroup.findFirst({
        where: { id: groupId },
        include: { product: true },
      });
      if (!group || group.product.companyId !== companyId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Grupo de opções não encontrado', code: 'group_not_found' } as any);
      }
      const count = await prisma.productOption.count({ where: { optionGroupId: groupId } });
      const option = await prisma.productOption.create({
        data: { ...request.body, optionGroupId: groupId, displayOrder: request.body.displayOrder ?? count },
      });
      logger.info({ userId: request.tenant.userId, companyId, groupId, optionId: option.id }, 'Opção criada');
      return reply.status(201).send(option as any);
    },
  );

  // PATCH /options/:id
  app.patch(
    '/options/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: ProductOptionCreateInput.partial(),
        response: { 200: ProductOptionResponse, 403: z.any(), 404: z.any() },
        tags: ['Options'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const option = await prisma.productOption.findFirst({
        where: { id },
        include: { optionGroup: { include: { product: true } } },
      });
      if (!option || option.optionGroup.product.companyId !== companyId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Opção não encontrada', code: 'option_not_found' } as any);
      }
      const updated = await prisma.productOption.update({ where: { id }, data: request.body });
      logger.info({ userId: request.tenant.userId, companyId, optionId: id }, 'Opção atualizada');
      return updated as any;
    },
  );

  // DELETE /options/:id
  app.delete(
    '/options/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.object({ ok: z.boolean() }), 403: z.any(), 404: z.any() },
        tags: ['Options'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const option = await prisma.productOption.findFirst({
        where: { id },
        include: { optionGroup: { include: { product: true } } },
      });
      if (!option || option.optionGroup.product.companyId !== companyId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Opção não encontrada', code: 'option_not_found' } as any);
      }
      await prisma.productOption.delete({ where: { id } });
      logger.info({ userId: request.tenant.userId, companyId, optionId: id }, 'Opção removida');
      return { ok: true };
    },
  );
};
