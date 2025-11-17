# ========================================
# Multi-stage Dockerfile for Audit Service
# ========================================

# ----------------------------------------
# Stage 1: Builder
# ----------------------------------------
FROM rust:1.75-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    pkgconfig \
    openssl-dev \
    openssl-libs-static

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY Cargo.toml ./
COPY Cargo.lock ./

# Copy all service and library crates
COPY services/audit-service ./services/audit-service
COPY libs ./libs

# Build the service in release mode
RUN cargo build --release --package audit-service

# Strip debug symbols to reduce binary size
RUN strip /app/target/release/audit-service

# ----------------------------------------
# Stage 2: Runtime
# ----------------------------------------
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    libgcc

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/audit-service /app/audit-service

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose service port
EXPOSE 8084

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8084/health || exit 1

# Run the service
CMD ["/app/audit-service"]
