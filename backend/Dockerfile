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

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts && \
    npm rebuild bcrypt && \
    npx prisma generate && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Security: run as non-root user
USER node

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
