# Configura3D

Plataforma profissional de configuração 3D de produtos e geração de orçamentos.

Permite que fabricantes, lojas de móveis, empresas de móveis planejados,
fabricantes de brindes e negócios de produtos personalizados apresentem seus
produtos de maneira interativa, com editor administrativo, persistência de
dados, regras de compatibilidade, cálculo de preços, geração de propostas e
arquitetura preparada para crescer (multiempresa, mobile futura).

> **Nota importante:** não há modelos comerciais reais incluídos. Um modelo de
> demonstração simples (identificado como tal) é gerado automaticamente para
> validar o fluxo do configurador.

## Estrutura do repositório (monorepo, npm workspaces)

```
apps/api       - Backend: Node.js, TypeScript, Fastify, Prisma, Zod, OpenAPI
apps/web       - Frontend: React, TypeScript, Vite, Tailwind, R3F/Drei
packages/shared- Tipos eschemas Zod compartilhados entre API e frontend
docker-compose.yml - PostgreSQL, Redis, MinIO (S3), API, Web
```

## Pré-requisitos

- Node.js >= 20
- Docker e Docker Compose (recomendado para subir banco, Redis e MinIO)

## Execução local (desenvolvimento)

### 1. Variáveis de ambiente

```bash
cp .env.example .env
# Edite .env se necessário (JWT_SECRET, etc.)
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Subir infraestrutura (PostgreSQL, Redis, MinIO)

```bash
docker compose up -d db redis minio
```

### 4. Gerar cliente Prisma e aplicar migrations

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Rodar API

```bash
cd apps/api
npm run dev
```

A API ficará disponível em `http://localhost:3333`.
Documentação OpenAPI em `http://localhost:3333/docs`.

### 6. Rodar frontend

```bash
cd apps/web
npm run dev
```

O frontend ficará disponível em `http://localhost:5173`.

### 7. Tudo junto com Docker

```bash
docker compose up --build
```

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Renderização 3D | Three.js, @react-three/fiber, @react-three/drei |
| Backend | Node.js, TypeScript, Fastify |
| Banco | PostgreSQL 16 + Prisma ORM |
| Cache / filas | Redis |
| Armazenamento de objetos | S3 compatível (MinIO local) |
| Validação | Zod |
| Documentação | OpenAPI (fastify-swagger) |
| Testes | Vitest |
| Mobile (futuro) | Flutter ou React Native |

## Modelo de dinheiro (importante)

Todos os valores monetários são armazenados como **inteiros em centavos**
(`Int` no Prisma) para evitar erros de ponto flutuante. O frontend exibe
formatados em moeda, mas o preço definitivo é sempre recalculado e validado
pelo backend. Nunca aceite preço enviado pelo cliente sem validação.

## Documentação

- `docs/` - execução local, upload de modelos, preparação de modelos 3D,
  implantação, multiempresa, banco primary-replica.

## Critérios de conclusão do MVP

1. Empresa cadastra um produto.
2. Administrador associa um modelo 3D real.
3. Usuário gira e aproxima o produto.
4. Opções alteram os componentes corretos.
5. Combinações incompatíveis são bloqueadas.
6. Preço validado pelo backend.
7. Configuração salva e retomada.
8. Link compartilhável funciona.
9. Solicitação de orçamento persistida.
10. Interface funciona em telas de 360 px.
11. Testes essenciais passam.
12. Documentação permite executar do zero.
