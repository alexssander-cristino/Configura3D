FROM node:22-alpine

# Bibliotecas necessárias ao Prisma no Alpine Linux.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# O contexto de build precisa ser a raiz do monorepo.
COPY . .

# Gera primeiro o cliente Prisma. Sem isso, o TypeScript pode enxergar
# tipos incompletos e falhar em consultas, transações e relações.
# O pacote compartilhado também precisa ser compilado antes da API.
RUN npm install \
    && npm run build --workspace=packages/shared \
    && npm run prisma:generate --workspace=apps/api \
    && npm run build --workspace=apps/api

EXPOSE 3334

# Executa as migrações antes de iniciar o servidor.
CMD ["sh", "-c", "npm run prisma:deploy --workspace=apps/api && npm run start --workspace=apps/api"]
