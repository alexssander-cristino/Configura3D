import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

/**
 * Endpoints somente de leitura para o configurador público.
 * Apenas produtos publicados e não arquivados são expostos.
 */
export const publicConfiguratorRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/public/products/:slug',
    {
      schema: {
        params: z.object({ slug: z.string().min(1).max(100) }),
        tags: ['Public Configurator'],
      },
    },
    async (request: any, reply) => {
      const { slug } = request.params;

      const product = await prisma.product.findFirst({
        where: {
          slug,
          isPublished: true,
          isArchived: false,
          company: { isActive: true },
        },
        include: {
          modelAsset: true,
          optionGroups: {
            orderBy: { displayOrder: 'asc' },
            include: {
              options: {
                where: { isAvailable: true, isDiscontinued: false },
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      });

      if (!product) {
        return reply.status(404).send({
          error: 'NotFound',
          message: 'Produto publicado não encontrado',
          code: 'public_product_not_found',
        });
      }

      const { optionGroups, ...publicProduct } = product;
      return { product: publicProduct, optionGroups };
    },
  );
};
