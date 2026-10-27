import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'crypto';
import { UploadUrlInput, UploadUrlOutput } from '@configura3d/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getStorage, storageBucket } from '../lib/s3';

const requireAuth = (app: any) => {
  app.addHook('preHandler', async (request: any, reply: any) => {
    if (!request.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Não autenticado', code: 'not_authenticated' });
    }
  });
};

export const uploadRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // POST /upload/url — retorna URL assinada para upload direto no object storage
  app.post(
    '/upload/url',
    {
      schema: {
        body: UploadUrlInput,
        response: { 200: UploadUrlOutput, 400: z.any(), 403: z.any() },
        tags: ['Upload'],
      },
    },
    async (request: any, reply) => {
      const { companyId } = request.tenant;
      const { filename, mimeType, sizeBytes } = request.body;

      // Validação de tipo e tamanho (defesa em profundidade)
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'model/gltf-binary', 'model/gltf+json', 'application/octet-stream'];
      if (!allowed.includes(mimeType)) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Tipo de arquivo não permitido', code: 'invalid_mime_type' });
      }
      if (sizeBytes > 50 * 1024 * 1024) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Arquivo excede o limite de 50 MB', code: 'file_too_large' });
      }

      const storage = getStorage();
      const key = `uploads/${companyId}/${crypto.randomUUID()}-${filename}`;

      if (storage) {
        const uploadUrl = await storage.getSignedUrl({
          Bucket: storageBucket(),
          Key: key,
          Expires: 900, // 15 minutos
        });
        const assetUrl = `${process.env.PUBLIC_ASSETS_URL || ''}/${key}`;
        return { uploadUrl, assetUrl } as any;
      }

      // Fallback sem storage externo: informa que não está configurado
      return reply.status(501).send({ error: 'NotImplemented', message: 'Object storage não configurado', code: 'storage_not_configured' } as any);
    },
  );

  // POST /upload/complete — registra um asset após upload concluído
  app.post(
    '/upload/complete',
    {
      schema: {
        body: z.object({
          filename: z.string(),
          url: z.string().url(),
          mimeType: z.string(),
          sizeBytes: z.number().int().nonnegative(),
          companyId: z.string().optional(),
        }),
        response: { 201: z.any(), 403: z.any() },
        tags: ['Upload'],
      },
    },
    async (request: any, reply) => {
      const { companyId } = request.tenant;
      const targetCompanyId = request.body.companyId || companyId;
      if (targetCompanyId !== companyId) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Empresa não autorizada', code: 'no_access' } as any);
      }
      const asset = await prisma.storageAsset.create({
        data: { companyId: targetCompanyId, filename: request.body.filename, url: request.body.url, mimeType: request.body.mimeType, sizeBytes: request.body.sizeBytes },
      });
      logger.info({ userId: request.tenant.userId, companyId, assetId: asset.id }, 'Asset de storage registrado');
      return reply.status(201).send(asset as any);
    },
  );
};
