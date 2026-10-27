FROM node:22-alpine

# Dependências nativas necessárias ao Prisma no Alpine.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# A API usa o workspace compartilhado @configura3d/shared.
# O contexto de build é a raiz do monorepo.
COPY . .

# Instala os workspaces, compila o pacote compartilhado e a API,
# gera o cliente Prisma e remove dependências de desenvolvimento.
RUN npm install \
    && npm run build --workspace=packages/shared \
    && npm run build --workspace=apps/api \
    && npx prisma generate --workspace=apps/api \
    && npm prune --omit=dev

EXPOSE 3334

CMD ["sh", "-c", "npx prisma migrate deploy --workspace=apps/api && npm run start --workspace=apps/api"]
