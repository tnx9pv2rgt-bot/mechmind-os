# =============================================================================
# MechMind OS v10 - Lambda Container Dockerfile
# Optimized for AWS Lambda with NestJS
# =============================================================================

# Stage 1: Build
FROM public.ecr.aws/docker/library/node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Stage 2: Production Dependencies
FROM public.ecr.aws/docker/library/node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

# Install production dependencies only
RUN npm ci --production && npm cache clean --force

# Stage 3: Runtime (Lambda Container)
FROM public.ecr.aws/lambda/nodejs:20

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy package.json for metadata
COPY --from=builder /app/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV AWS_NODEJS_CONNECTION_REUSE_ENABLED=1
ENV AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE=1

# Lambda handler
CMD ["dist/lambda.handler"]

# =============================================================================
# Alternative: Multi-function container (for Lambda container image support)
# =============================================================================
# To use container images instead of zip files:
#
# 1. Build and push to ECR:
#    docker build -t mechmind-api .
#    docker tag mechmind-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mechmind-api:latest
#    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mechmind-api:latest
#
# 2. Update Lambda to use container image
#
# =============================================================================
# Multi-architecture build (for ARM64 Graviton2 cost savings):
#
# docker buildx create --use
# docker buildx build --platform linux/arm64 -t mechmind-api:arm64 .
# =============================================================================
