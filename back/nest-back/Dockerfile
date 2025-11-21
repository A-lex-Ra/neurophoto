# Build stage
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies with legacy peer deps due to @nestjs/bullmq compatibility
RUN npm install --legacy-peer-deps

# Copy source code
COPY src ./src
COPY prisma ./prisma

# Generate Prisma Client
RUN npm run prisma:generate

# Build application
RUN npm run build

# Production stage
FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies with legacy peer deps
RUN npm install --omit=dev --legacy-peer-deps

# Copy built app and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Debug info
RUN ls -la /app/dist

# Expose port
EXPOSE 3001

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
