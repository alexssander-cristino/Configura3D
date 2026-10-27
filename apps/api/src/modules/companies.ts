import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { CompanyCreateInput, CompanyUpdateInput, CompanyResponse, CompanyMemberInput, CompanyMemberResponse } from '@configura3d/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const requireAuth = (app: any) => {
  app.addHook('preHandler', async (request: any, reply: any) => {
    if (!request.tenant) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Não autenticado', code: 'not_authenticated' });
    }
  });
};

export const companyRoutes: FastifyPluginAsyncZod = async (app) => {
  requireAuth(app);

  // GET /companies — lista empresas do usuário (geralmente 1 no MVP)
  app.get(
    '/companies',
    {
      schema: {
        response: { 200: z.array(CompanyResponse) },
        tags: ['Companies'],
      },
    },
    async (request: any) => {
      const members = await prisma.companyMember.findMany({
        where: { userId: request.tenant.userId },
        include: { company: true },
      });
      return members.map((m) => m.company) as any;
    },
  );

  // POST /companies — criar empresa
  app.post(
    '/companies',
    {
      schema: {
        body: CompanyCreateInput,
        response: { 201: CompanyResponse },
        tags: ['Companies'],
      },
    },
    async (request: any, reply) => {
      // O tenant do token vem do registro/login; aqui o usuário cria uma nova empresa
      const company = await prisma.company.create({
        data: {
          name: request.body.name,
          slug: request.body.slug,
          domain: request.body.domain || null,
          settings: request.body.settings || {},
        },
      });
      await prisma.companyMember.create({
        data: { companyId: company.id, userId: request.tenant.userId, role: 'owner', permissions: [] },
      });
      logger.info({ userId: request.tenant.userId, companyId: company.id }, 'Empresa criada');
      return reply.status(201).send(company as any);
    },
  );

  // GET /companies/:id
  app.get(
    '/companies/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: CompanyResponse, 404: z.any(), 403: z.any() },
        tags: ['Companies'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const member = await prisma.companyMember.findFirst({
        where: { companyId: id, userId: request.tenant.userId },
      });
      if (!member) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem acesso a esta empresa', code: 'no_access' } as any);
      }
      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) {
        return reply.status(404).send({ error: 'NotFound', message: 'Empresa não encontrada', code: 'company_not_found' } as any);
      }
      return company as any;
    },
  );

  // PATCH /companies/:id
  app.patch(
    '/companies/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: CompanyUpdateInput,
        response: { 200: CompanyResponse, 403: z.any(), 404: z.any() },
        tags: ['Companies'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const member = await prisma.companyMember.findFirst({
        where: { companyId: id, userId: request.tenant.userId },
      });
      if (!member || !['owner', 'admin'].includes(member.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem permissão para editar esta empresa', code: 'insufficient_role' } as any);
      }
      const company = await prisma.company.update({
        where: { id },
        data: { ...request.body, updatedAt: new Date() },
      });
      logger.info({ userId: request.tenant.userId, companyId: id }, 'Empresa atualizada');
      return company as any;
    },
  );

  // GET /companies/:id/members
  app.get(
    '/companies/:id/members',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.array(CompanyMemberResponse), 403: z.any() },
        tags: ['Companies'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const member = await prisma.companyMember.findFirst({
        where: { companyId: id, userId: request.tenant.userId },
      });
      if (!member) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem acesso a esta empresa', code: 'no_access' } as any);
      }
      const members = await prisma.companyMember.findMany({
        where: { companyId: id },
        include: { user: true },
      });
      return members.map((m) => ({
        id: m.id,
        companyId: m.companyId,
        userId: m.userId,
        user: {
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.user.role,
          isActive: m.user.isActive,
          createdAt: m.user.createdAt.toISOString(),
        },
        role: m.role,
        permissions: (m.permissions as string[]) || [],
        createdAt: m.createdAt.toISOString(),
      })) as any;
    },
  );

  // POST /companies/:id/members
  app.post(
    '/companies/:id/members',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: CompanyMemberInput,
        response: { 201: CompanyMemberResponse, 403: z.any(), 404: z.any() },
        tags: ['Companies'],
      },
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const caller = await prisma.companyMember.findFirst({
        where: { companyId: id, userId: request.tenant.userId },
      });
      if (!caller || !['owner', 'admin'].includes(caller.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Sem permissão para adicionar membros', code: 'insufficient_role' });
      }
      const { userId, role, permissions } = request.body;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'NotFound', message: 'Usuário não encontrado', code: 'user_not_found' });
      }
      const member = await prisma.companyMember.create({
        data: { companyId: id, userId, role, permissions: permissions || [] },
        include: { user: true },
      });
      return reply.status(201).send({
        id: member.id,
        companyId: member.companyId,
        userId: member.userId,
        user: {
          id: member.user.id,
          email: member.user.email,
          name: member.user.name,
          role: member.user.role,
          isActive: member.user.isActive,
          createdAt: member.user.createdAt.toISOString(),
        },
        role: member.role,
        permissions: (member.permissions as string[]) || [],
        createdAt: member.createdAt.toISOString(),
      });
    },
  );
};
