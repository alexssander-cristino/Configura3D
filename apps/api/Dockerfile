FROM node:22-alpine

# Prisma precisa das bibliotecas OpenSSL disponíveis no Alpine.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Dependências de produção
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Código da aplicação
COPY . .

# Gera o cliente Prisma
ENV DATABASE_URL=""
RUN npx prisma generate

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
