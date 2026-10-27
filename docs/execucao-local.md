# Execução Local - Configura3D

Executa a plataforma completa (API + frontend + PostgreSQL + Redis + MinIO) em
desenvolvimento usando Docker Compose.

## Pré-requisitos

- Node.js >= 20
- Docker e Docker Compose

## 1. Variáveis de ambiente

```bash
cp .env.example .env
# Edite .env se necessário (ex: JWT_SECRET, DATABASE_URL, CORS_ORIGINS)
```

O arquivo `.env.example` já aponta para o PostgreSQL sobe pelo Docker Compose
(`localhost:5432`).

## 2. Instalar dependências

```bash
npm install
```

Isso instala e linka os workspaces: `apps/api`, `apps/web` e `packages/shared`.

## 3. Subir a infraestrutura (PostgreSQL, Redis, MinIO)

```bash
docker compose up -d db redis minio
```

Verifique se estão saudáveis:

```bash
docker compose ps
```

> Se você já tem um PostgreSQL na porta 5432, aumente a porta do container no
> `docker-compose.yml` ou aponte `DATABASE_URL` para a instância existente.

## 4. Preparar o banco de dados

No workspace da API:

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

Opcional — semear dados de demonstração (empresa, usuário, produto demo com
modelo 3D, opções e preços):

```bash
$env:DATABASE_URL="postgresql://configura3d:configura3d@localhost:5432/configura3d?schema=public"
npx tsx scripts/seed-demo.ts
```

Credenciais da demo: `demo@configura3d.com` / `demo1234`.

## 5. Gerar o modelo 3D de demonstração (opcional)

O modelo GLB de demo já está em `apps/web/public/models/demo-organizador.glb`.
Para regenerar:

```bash
node scripts/generate-demo-model.mjs
```

## 6. Rodar a API

```bash
cd apps/api
npm run dev   # tsx watch
# ou, em produção:
npm run build
npm run start
```

A API fica em `http://localhost:3333`. Documentação OpenAPI em
`http://localhost:3333/docs`.

## 7. Rodar o frontend

```bash
cd apps/web
npm run dev   # Vite, http://localhost:5173
```

O Vite proxia `/api` para `http://localhost:3333` (veja `vite.config.ts`).

## 8. Tudo junto com Docker

```bash
docker compose up --build
```

A API e o frontend ficam disponíveis nas portas 3333 e 5173.

## 9. Testes

```bash
# Backend (Vitest)
cd apps/api
$env:DATABASE_URL="..."
npx vitest run

# Frontend (Vitest)
cd apps/web
npx vitest run

# Build de produção do frontend
cd apps/web
npm run build
```

## Estrutura de portas

| Serviço | Porta |
|---------|-------|
| API (Fastify) | 3333 |
| Frontend (Vite) | 5173 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO (S3) | 9000 (API) / 9001 (Console) |
