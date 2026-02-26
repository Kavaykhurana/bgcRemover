# Dockerfile — multi-stage build
FROM node:20-alpine AS builder

# Required specifically for building some native modules like sharp
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
# Add an unprivileged user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules and project source files
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Ensure temp directory exists and has appropriate permissions
RUN mkdir -p /tmp && chown -R appuser:appgroup /tmp
RUN mkdir -p /app/models && chown -R appuser:appgroup /app/models

# Download model in build step
RUN node scripts/download-model.js

# Switch context for security
USER appuser

EXPOSE 3000

# Start server
CMD ["node", "server.js"]
