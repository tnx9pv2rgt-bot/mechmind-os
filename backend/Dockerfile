FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Copy pre-built dist folder
COPY dist ./dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
