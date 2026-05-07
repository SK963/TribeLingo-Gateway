# Base stage for building
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build the TypeScript code
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# We only need production dependencies in the final image
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist
# Copy prisma folder so we can run migrations if needed
COPY --from=builder /app/prisma ./prisma
# Copy generated Prisma Client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Set default environment
ENV NODE_ENV=production
ENV PORT=4000

# Expose the port
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start"]
