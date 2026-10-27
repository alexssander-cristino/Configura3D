# Implantação (Deploy)

## Build da API

```bash
cd apps/api
npm run build        # tsc + prisma generate
# variáveis de ambiente: DATABASE_URL, JWT_SECRET, etc.
npm run start        # node dist/index.js
```

Dockerfile disponível em `apps/api/Dockerfile` (roda `prisma migrate deploy`
antes de iniciar).

## Build do Frontend

```bash
cd apps/web
npm run build        # Vite -> dist/
```

Servir `dist/` com nginx (veja `apps/web/nginx.conf`) ou qualquer CDN. O
frontend chama a API via `VITE_API_URL`.

## Banco de dados

- Primário: PostgreSQL (todas as gravações).
- Réplica opcional: para leitura, com estratégia de fallback se indisponível
  (veja `docker-compose.yml`, serviço `db-replica` comentado).
- Backups: dump periódico do PostgreSQL + procedimento de restauração.

## Armazenamento de objetos

- S3 compatível (MinIO em dev, AWS S3 / outro em prod).
- URLs assinadas para assets privados.
- `PUBLIC_ASSETS_URL` define a URL pública dos assets.

## Segurança

- Segredos (`JWT_SECRET`, `DATABASE_URL`, `S3_*`) apenas em variáveis de
  ambiente.
- CORS restritivo (`CORS_ORIGINS`).
- Rate limiting na API.
- Senhas com bcrypt (salt rounds configurável).
- Auditoria de alterações (`audit_logs`).

## Multiempresa (SaaS)

Cada empresa é um `Company` com slug/domínio próprios. O isolamento é imposto
no backend e por constraints/índices no banco (não somente no frontend).
