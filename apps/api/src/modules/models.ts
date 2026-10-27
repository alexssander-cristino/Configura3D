import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ModelAssetCreateInput, ModelAssetResponse, ModelComponentInput, ModelComponentResponse,
} from '@configura3d/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { MODEL_UPLOAD } from '@configura3d/shared';

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

export const modelRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // GET /models — listar modelos da empresa
  app.get(
    '/models',
    {
      schema: {
        querystring: z.object({
          processingStatus: z.enum(['pending', 'processing', 'ready', 'failed']).optional(),
          page: z.coerce.number().min(1).default(1),
          pageSize: z.coerce.number().min(1).max(100).default(20),
        }),
        response: { 200: z.object({ items: z.array(ModelAssetResponse), total: z.number(), page: z.number(), pageSize: z.number() }) },
        tags: ['Models'],
      },
    },
    async (request: any) => {
      const { companyId } = request.tenant;
      const { processingStatus, page, pageSize } = request.query;
      const skip = (page - 1) * pageSize;
      const where: any = { companyId };
      if (processingStatus) where.processingStatus = processingStatus;
      const [items, total] = await prisma.$transaction([
        prisma.modelAsset.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.modelAsset.count({ where }),
      ]);
      return { items, total, page, pageSize } as any;
    },
  );

  // POST /models — cadastrar um modelo (aponta para arquivo já enviado ou cria pendente)
  app.post(
    '/models',
    {
      schema: {
        body: ModelAssetCreateInput,
        response: { 201: ModelAssetResponse, 403: z.any(), 400: z.any() },
        tags: ['Models'],
      },
    },
    async (request: any, reply) => {
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const { mimeType, sizeBytes, fileUrl } = request.body;
      const ext = fileUrl.toLowerCase().endsWith('.glb') ? '.glb' : fileUrl.toLowerCase().endsWith('.gltf') ? '.gltf' : '';
      if (!MODEL_UPLOAD.ALLOWED_EXTENSIONS.includes(ext)) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Extensão não permitida. Use .glb ou .gltf', code: 'invalid_extension' } as any);
      }
      if (sizeBytes > MODEL_UPLOAD.MAX_SIZE_BYTES) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Arquivo excede o tamanho máximo permitido', code: 'file_too_large' } as any);
      }
      const model = await prisma.modelAsset.create({
        data: {
          ...request.body,
          companyId,
          sizeBytes,
          processingStatus: 'pending',
          metadata: request.body.metadata || {},
        },
      });
      logger.info({ userId: request.tenant.userId, companyId, modelId: model.id }, 'Modelo cadastrado');
      return reply.status(201).send(model as any);
    },
  );

  // GET /models/:id
  app.get(
    '/models/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: ModelAssetResponse, 403: z.any(), 404: z.any() },
        tags: ['Models'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      const model = await prisma.modelAsset.findFirst({ where: { id, companyId } });
      if (!model) {
        return reply.status(404).send({ error: 'NotFound', message: 'Modelo não encontrado', code: 'model_not_found' } as any);
      }
      return model as any;
    },
  );

  // PATCH /models/:id
  app.patch(
    '/models/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: ModelAssetCreateInput.partial(),
        response: { 200: ModelAssetResponse, 403: z.any(), 404: z.any() },
        tags: ['Models'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const model = await prisma.modelAsset.findFirst({ where: { id, companyId } });
      if (!model) {
        return reply.status(404).send({ error: 'NotFound', message: 'Modelo não encontrado', code: 'model_not_found' } as any);
      }
      const updated = await prisma.modelAsset.update({ where: { id }, data: request.body });
      logger.info({ userId: request.tenant.userId, companyId, modelId: id }, 'Modelo atualizado');
      return updated as any;
    },
  );

  // GET /models/:id/components — listar componentes mapeados
  app.get(
    '/models/:id/components',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.array(ModelComponentResponse), 404: z.any() },
        tags: ['Models'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      const model = await prisma.modelAsset.findFirst({ where: { id, companyId } });
      if (!model) {
        return reply.status(404).send({ error: 'NotFound', message: 'Modelo não encontrado', code: 'model_not_found' } as any);
      }
      return prisma.modelComponent.findMany({
        where: { modelAssetId: id },
        orderBy: { displayOrder: 'asc' },
      }) as any;
    },
  );

  // POST /models/:id/components — mapear um componente configurável
  app.post(
    '/models/:id/components',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: ModelComponentInput,
        response: { 201: ModelComponentResponse, 403: z.any(), 404: z.any() },
        tags: ['Models'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { companyId } = request.tenant;
      if (!['owner', 'admin', 'editor'].includes(request.tenant.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Permissão insuficiente', code: 'insufficient_role' } as any);
      }
      const model = await prisma.modelAsset.findFirst({ where: { id, companyId } });
      if (!model) {
        return reply.status(404).send({ error: 'NotFound', message: 'Modelo não encontrado', code: 'model_not_found' } as any);
      }
      const count = await prisma.modelComponent.count({ where: { modelAssetId: id } });
      const component = await prisma.modelComponent.create({
        data: { ...request.body, modelAssetId: id, displayOrder: count },
      });
      logger.info({ userId: request.tenant.userId, companyId, modelId: id, componentId: component.id }, 'Componente mapeado');
      return reply.status(201).send(component as any);
    },
  );
};
