#!/bin/bash
set -e

# LLM Governance Dashboard - Quick Start Script
# Version: 1.0.0
# Description: One-command deployment for development/testing

echo "========================================="
echo "LLM Governance Dashboard - Quick Start"
echo "Version: 1.0.0"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_info "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_info "✓ Docker found: $(docker --version)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_info "✓ Docker Compose found: $(docker-compose --version)"

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

print_info "Project root: $PROJECT_ROOT"

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    print_warn ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_info "✓ Created .env file. Please review and update as needed."
    else
        print_error ".env.example not found. Cannot create .env file."
        exit 1
    fi
else
    print_info "✓ .env file exists"
fi

# Pull latest images
print_info "Pulling Docker images (this may take a while on first run)..."
docker-compose pull

# Start services
print_info "Starting services..."
docker-compose up -d

# Wait for services to be healthy
print_info "Waiting for services to be healthy..."
sleep 10

# Check service health
print_info "Checking service health..."

SERVICES=(
    "http://localhost:8080/api/v1/health:API Gateway"
    "http://localhost:8081/api/v1/health:Auth Service"
    "http://localhost:8082/api/v1/health:User Service"
    "http://localhost:8083/api/v1/health:Policy Service"
    "http://localhost:8084/api/v1/health:Audit Service"
    "http://localhost:8085/api/v1/health:Metrics Service"
    "http://localhost:8086/api/v1/health:Cost Service"
    "http://localhost:8087/api/v1/health:Integration Service"
)

HEALTHY=0
TOTAL=${#SERVICES[@]}

for service in "${SERVICES[@]}"; do
    IFS=: read -r url name <<< "$service"
    if curl -s -f -o /dev/null "$url"; then
        print_info "✓ $name is healthy"
        ((HEALTHY++))
    else
        print_warn "✗ $name is not responding"
    fi
done

echo ""
echo "========================================="
echo "Health Check Results: $HEALTHY/$TOTAL services healthy"
echo "========================================="
echo ""

if [ $HEALTHY -eq $TOTAL ]; then
    print_info "All services are healthy!"
else
    print_warn "Some services are not healthy. Check logs with: docker-compose logs [service-name]"
fi

# Display access information
echo ""
echo "========================================="
echo "Access Information"
echo "========================================="
echo ""
echo "Frontend Dashboard:  http://localhost:3000"
echo "API Gateway:         http://localhost:8080"
echo "API Documentation:   http://localhost:8080/api/v1/docs"
echo "Prometheus:          http://localhost:9090"
echo "Grafana:             http://localhost:3001"
echo ""
echo "Default Credentials:"
echo "  Email:    admin@example.com"
echo "  Password: Change-Me-123!"
echo ""
print_warn "IMPORTANT: Change default credentials immediately!"
echo ""

# Display useful commands
echo "========================================="
echo "Useful Commands"
echo "========================================="
echo ""
echo "View logs:           docker-compose logs -f [service-name]"
echo "Stop services:       docker-compose down"
echo "Restart service:     docker-compose restart [service-name]"
echo "View running services: docker-compose ps"
echo "Check health:        ./scripts/health-check.sh"
echo ""

print_info "Quick start complete! Happy governing!"
