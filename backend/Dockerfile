FROM node:20-slim

WORKDIR /app

# Installa dipendenze necessarie
RUN apt-get update && apt-get install -y openssl libssl-dev

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 10000

CMD ["node", "dist/main"]
