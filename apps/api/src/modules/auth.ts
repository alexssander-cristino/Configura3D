import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { hashPassword, comparePassword, signToken } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { UserLoginInput, UserCreateInput, UserResponse, CompanyCreateInput, CompanyResponse } from '@configura3d/shared';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const RegisterBody = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(200),
    role: z.enum(['owner', 'admin', 'editor', 'viewer']).optional().default('editor'),
    company: z.object({
      name: z.string().min(1).max(200),
      slug: z.string().regex(/^[a-z0-9_-]+$/, 'slug inválido').min(1).max(100),
      domain: z.string().optional(),
      settings: z.record(z.any()).optional().default({}),
    }),
  });

  // POST /auth/register — cadastra usuário e cria sua empresa (primeiro acesso)
  app.post(
    '/register',
    {
      schema: {
        body: RegisterBody,
        response: { 201: z.object({ user: UserResponse, company: CompanyResponse, token: z.string() }) },
        tags: ['Auth'],
      },
    },
    async (request, reply) => {
      const { email, password, name, role, company } = request.body;
      // Verifica se email já existe
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({ error: 'Conflict', message: 'E-mail já cadastrado', code: 'email_exists' } as any);
      }
      // Verifica se slug da empresa já existe
      const existingSlug = await prisma.company.findUnique({ where: { slug: company.slug } });
      if (existingSlug) {
        return reply.status(409).send({ error: 'Conflict', message: 'Slug da empresa já está em uso', code: 'slug_exists' } as any);
      }
      // Cria empresa e usuário em transação
      const passwordHash = await hashPassword(password);
      const result = await prisma.$transaction(async (tx) => {
        const c = await tx.company.create({
          data: { name: company.name, slug: company.slug, domain: company.domain || null, settings: company.settings },
        });
        const u = await tx.user.create({
          data: { email, passwordHash, name, role: role ?? 'editor' },
        });
        await tx.companyMember.create({
          data: { companyId: c.id, userId: u.id, role: 'owner', permissions: [] },
        });
        return { user: u, company: c };
      });
      const token = await signToken(app, {
        sub: result.user.id,
        email: result.user.email,
        companyId: result.company.id,
        role: result.user.role,
        permissions: [],
      });
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
      logger.info({ userId: result.user.id, companyId: result.company.id }, 'Usuário registrado');
      return reply.status(201).send({ user: result.user, company: result.company, token } as any);
    },
  );

  // POST /auth/login
  app.post(
    '/login',
    {
      schema: {
        body: UserLoginInput,
        response: { 200: z.object({ user: UserResponse, token: z.string() }) },
        tags: ['Auth'],
      },
    },
    async (request, reply) => {
      const body = request.body as any;
      const { email, password } = body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Credenciais inválidas', code: 'invalid_credentials' } as any);
      }
      const ok = await comparePassword(password, user.passwordHash);
      if (!ok) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Credenciais inválidas', code: 'invalid_credentials' } as any);
      }
      const member = await prisma.companyMember.findFirst({
        where: { userId: user.id },
        include: { company: true },
      });
      if (!member) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Usuário não vinculado a nenhuma empresa', code: 'no_company' } as any);
      }
      const token = await signToken(app, {
        sub: user.id,
        email: user.email,
        companyId: member.companyId,
        role: member.role,
        permissions: (member.permissions as string[]) || [],
      });
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
      logger.info({ userId: user.id, companyId: member.companyId }, 'Login realizado');
      return { user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, createdAt: user.createdAt.toISOString() }, token } as any;
    },
  );

  // POST /auth/logout
  app.post(
    '/logout',
    {
      schema: { response: { 200: z.object({ ok: z.boolean() }) }, tags: ['Auth'] },
    },
    async (_request, reply) => {
      reply.clearCookie('token', { path: '/' });
      return { ok: true };
    },
  );

  // GET /auth/me
  app.get(
    '/me',
    {
      schema: { response: { 200: z.object({ user: UserResponse, companyId: z.string().nullable() }) }, tags: ['Auth'] },
    },
    async (request, reply) => {
      const token = request.cookies.token || (request.headers.authorization as string)?.replace('Bearer ', '');
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Não autenticado', code: 'not_authenticated' } as any);
      }
      try {
        const payload = await app.jwt.verify<{ sub: string; email: string; companyId: string; role: string }>(token);
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) {
          return reply.status(404).send({ error: 'NotFound', message: 'Usuário não encontrado', code: 'user_not_found' } as any);
        }
        return { user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, createdAt: user.createdAt.toISOString() }, companyId: payload.companyId } as any;
      } catch {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Sessão inválida', code: 'invalid_session' } as any);
      }
    },
  );
};
