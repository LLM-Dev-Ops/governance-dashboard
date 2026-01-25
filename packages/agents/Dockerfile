# Phase 4 Layer 1 - Governance Agents Cloud Run Dockerfile
# Google Cloud Run optimized container for governance agents

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ============================================
# Stage 2: Production Runtime
# ============================================
FROM node:20-alpine AS runtime

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S agents -u 1001 -G nodejs

WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=builder --chown=agents:nodejs /app/dist ./dist
COPY --from=builder --chown=agents:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=agents:nodejs /app/package.json ./

# Phase 4 Layer 1 Environment Variables
ENV NODE_ENV=production
ENV AGENT_PHASE=phase4
ENV AGENT_LAYER=layer1

# Performance budgets (can be overridden)
ENV MAX_TOKENS=1200
ENV MAX_LATENCY_MS=2500

# Cloud Run specific settings
ENV PORT=8080

# Switch to non-root user
USER agents

# Expose Cloud Run port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the governance agents service
CMD ["node", "dist/handlers/cloud-run.js"]
