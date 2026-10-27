import fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyFormbody from '@fastify/formbody';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

import { authRoutes } from './modules/auth';
import { companyRoutes } from './modules/companies';
import { productRoutes } from './modules/products';
import { publicConfiguratorRoutes } from './modules/public-configurator';
import { modelRoutes } from './modules/models';
import { optionRoutes } from './modules/options';
import { compatibilityRoutes } from './modules/compatibility';
import { configurationRoutes } from './modules/configurations';
import { pricingRoutes } from './modules/pricing';
import { quoteRoutes } from './modules/quotes';
import { uploadRoutes } from './modules/upload';
import { auditRoutes } from './modules/audit';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: (process.env.LOG_LEVEL || 'info') as any,
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
    requestTimeout: 30_000,
    keepAliveTimeout: 5_000,
    bodyLimit: 60 * 1024 * 1024, // 60 MB para upload de modelos
  });

  // Validador e serializador baseados em Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  // Conversão de Date para ISO string ANTES da serialização JSON (hook roda
  // antes do serializerCompiler, então o serializer recebe strings já prontas).

  // CORS restritivo
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  await app.register(fastifyCors, {
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Cookies (sessão JWT)
  await app.register(fastifyCookie);

  // Parsers
  await app.register(fastifyFormbody);

  // JWT
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  });

  // Serializador global (pré-serialização): converte Date para ISO string em
  // toda resposta ANTES do JSON, garantindo que datas do Prisma saiam corretas.
  app.addHook('preSerialization', async (_request, reply, payload) => {
    const serialize = (v: any): any => {
      if (v === null || v === undefined) return v;
      if (v instanceof Date) return v.toISOString();
      if (Array.isArray(v)) return v.map(serialize);
      if (typeof v === 'object') {
        const o: any = {};
        for (const k of Object.keys(v)) o[k] = serialize(v[k]);
        return o;
      }
      return v;
    };
    return serialize(payload);
  });

  // Decorator de requisição com tenant do token
  app.decorateRequest('tenant', null as { companyId: string; userId: string; role: string; permissions: string[] } | null);
  app.addHook('preHandler', async (request: any) => {
    const token =
      request.cookies.token ||
      ((request.headers.authorization as string)?.replace('Bearer ', '') as string | undefined);
    if (!token) return;
    try {
      const payload = await app.jwt.verify<{
        sub: string;
        email: string;
        companyId: string;
        role: string;
        permissions: string[];
      }>(token);
      request.tenant = {
        companyId: payload.companyId,
        userId: payload.sub,
        role: payload.role,
        permissions: payload.permissions || [],
      };
    } catch {
      request.tenant = null;
    }
  });

  // Swagger / OpenAPI
  await app.register(require('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Configura3D API',
        description: 'API do configurador 3D de produtos e geração de orçamentos',
        version: '0.1.0',
      },
      servers: [{ url: process.env.API_URL || 'http://localhost:3333', description: 'Desenvolvimento' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });
  await app.register(require('@fastify/swagger-ui'), { routePrefix: '/docs' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', service: 'configura3d-api', time: new Date().toISOString() }));

  // Rotas de negócio
  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(companyRoutes, { prefix: '/api/v1' });
  app.register(publicConfiguratorRoutes, { prefix: '/api/v1' });
  app.register(productRoutes, { prefix: '/api/v1' });
  app.register(modelRoutes, { prefix: '/api/v1' });
  app.register(optionRoutes, { prefix: '/api/v1' });
  app.register(compatibilityRoutes, { prefix: '/api/v1' });
  app.register(configurationRoutes, { prefix: '/api/v1' });
  app.register(pricingRoutes, { prefix: '/api/v1' });
  app.register(quoteRoutes, { prefix: '/api/v1' });
  app.register(uploadRoutes, { prefix: '/api/v1' });
  app.register(auditRoutes, { prefix: '/api/v1' });

  // Middleware de erro global
  app.setErrorHandler((error: any, request: any, reply: any) => {
    logger.error(error, 'Erro não tratado na requisição');
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.name || 'InternalServerError',
      message: error.message || 'Erro interno do servidor',
      code: statusCode >= 500 ? 'internal_error' : 'request_error',
    });
  });

  // Middleware de "not found"
  app.setNotFoundHandler((request: any, reply: any) => {
    return reply.status(404).send({
      error: 'NotFound',
      message: `Rota não encontrada: ${request.method} ${request.url}`,
      code: 'not_found',
    });
  });

  return app;
}

if (require.main === module) {
  buildApp()
    .then((app) => {
      const port = Number(process.env.PORT || 3334);
      app.listen({ port, host: '0.0.0.0' }, (err: Error | null) => {
        if (err) {
          logger.error(err, 'Falha ao iniciar API');
          process.exit(1);
        }
        logger.info(`Configura3D API ouvindo em http://0.0.0.0:${port}`);
      });
    })
    .catch((err: Error) => {
      logger.error(err, 'Falha ao construir API');
      process.exit(1);
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
