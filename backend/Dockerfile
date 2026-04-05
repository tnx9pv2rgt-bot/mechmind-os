# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps && \
    npx prisma generate

COPY . .

RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev --legacy-peer-deps && \
    npm install prisma@5 --legacy-peer-deps && \
    npx prisma generate && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Fix permissions for node user
RUN chown -R node:node /app

# Security: run as non-root user
USER node

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss 2>/dev/null; node dist/main"]
