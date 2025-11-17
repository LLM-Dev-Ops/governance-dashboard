# ========================================
# Multi-stage Dockerfile for Frontend (SvelteKit)
# ========================================

# ----------------------------------------
# Stage 1: Builder
# ----------------------------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source
COPY . .

# Build the application
RUN npm run build

# ----------------------------------------
# Stage 2: Runtime
# ----------------------------------------
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Set working directory
WORKDIR /app

# Copy built application and dependencies from builder
COPY --from=builder --chown=appuser:appuser /app/build ./build
COPY --from=builder --chown=appuser:appuser /app/package*.json ./
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules

# Switch to non-root user
USER appuser

# Expose frontend port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build"]
