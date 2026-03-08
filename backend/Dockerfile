FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (ignore postinstall for now)
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts && \
    npm install prisma --legacy-peer-deps

# Rebuild bcrypt and generate Prisma
RUN npm rebuild bcrypt && \
    npx prisma generate

# Copy pre-built dist folder
COPY dist ./dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
