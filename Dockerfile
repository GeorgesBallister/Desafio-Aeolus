# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Instala dependências do sistema que o Prisma pode precisar
RUN apk add --no-cache openssl libc6-compat

# Copia package.json e package-lock se existir
COPY package*.json ./

# Instala dependências de produção e desenvolvimento
RUN npm ci || npm install

# Copia o restante do código
COPY . .

# Gera o client do Prisma (se necessário)
# Nota: como é MongoDB, não há migrações SQL, mas o client precisa ser gerado
RUN npx prisma generate || echo "prisma generate skipped"

# Define a porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "index.js"]
