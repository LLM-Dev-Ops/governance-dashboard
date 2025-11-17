#!/usr/bin/env bash

# ============================================================================
# start-services.sh - Start All Services
# ============================================================================
# Starts PostgreSQL, Redis, all backend services, and frontend
# Usage: ./scripts/start-services.sh [--build] [--no-frontend]
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Log directory
LOG_DIR="$PROJECT_ROOT/logs/services"
mkdir -p "$LOG_DIR"

# PID file
PID_FILE="$LOG_DIR/services.pid"

# Options
BUILD_FIRST=false
START_FRONTEND=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD_FIRST=true
            shift
            ;;
        --no-frontend)
            START_FRONTEND=false
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--build] [--no-frontend]"
            exit 1
            ;;
    esac
done

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# ============================================================================
# Service Management
# ============================================================================

print_header "LLM Governance Dashboard - Start Services"

# Clear PID file
> "$PID_FILE"

# ----------------------------------------------------------------------------
# Step 1: Build Services (Optional)
# ----------------------------------------------------------------------------
if [[ "$BUILD_FIRST" == true ]]; then
    print_step "Building services..."
    if [[ -f "scripts/build-all.sh" ]]; then
        bash scripts/build-all.sh
    else
        cargo build --workspace
    fi
    print_success "Build completed"
fi

# ----------------------------------------------------------------------------
# Step 2: Start PostgreSQL and Redis
# ----------------------------------------------------------------------------
print_step "Starting database services..."

# Check if docker-compose is available
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    if [[ -f "docker-compose.yml" ]]; then
        print_info "Starting PostgreSQL and Redis..."

        if docker compose up -d postgres redis 2>/dev/null || docker-compose up -d postgres redis 2>/dev/null; then
            print_success "Database services started"

            # Wait for PostgreSQL
            print_info "Waiting for PostgreSQL..."
            sleep 3
            MAX_RETRIES=30
            RETRY_COUNT=0
            until docker exec llm-governance-postgres pg_isready -U postgres &>/dev/null || [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; do
                echo -n "."
                sleep 1
                RETRY_COUNT=$((RETRY_COUNT + 1))
            done
            echo ""

            if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
                print_error "PostgreSQL failed to start"
                exit 1
            fi

            print_success "PostgreSQL ready"
            print_success "Redis ready"
        else
            print_error "Failed to start database services"
            exit 1
        fi
    else
        print_warning "docker-compose.yml not found"
    fi
else
    print_warning "Docker Compose not available. Make sure PostgreSQL and Redis are running."
fi

# ----------------------------------------------------------------------------
# Step 3: Start Backend Services
# ----------------------------------------------------------------------------
print_step "Starting backend services..."

# Source environment variables
if [[ -f ".env" ]]; then
    set -a
    source .env
    set +a
else
    print_warning ".env file not found, using default configuration"
fi

# Define services and their ports
declare -A SERVICES=(
    ["auth-service"]="8081"
    ["user-service"]="8082"
    ["policy-service"]="8083"
    ["audit-service"]="8084"
    ["metrics-service"]="8085"
    ["cost-service"]="8086"
    ["api-gateway"]="8080"
    ["integration-service"]="8087"
)

# Start each service
for service in "${!SERVICES[@]}"; do
    port=${SERVICES[$service]}
    log_file="$LOG_DIR/${service}.log"

    print_info "Starting ${service} on port ${port}..."

    # Check if binary exists
    if [[ -f "target/debug/${service}" ]]; then
        # Start service in background
        nohup "target/debug/${service}" > "$log_file" 2>&1 &
        pid=$!

        # Save PID
        echo "${service}:${pid}:${port}" >> "$PID_FILE"

        # Wait a moment and check if still running
        sleep 1
        if kill -0 $pid 2>/dev/null; then
            print_success "${service} started (PID: ${pid}, Port: ${port})"
        else
            print_error "${service} failed to start. Check log: ${log_file}"
        fi
    else
        print_error "${service} binary not found. Run './scripts/build-all.sh' first."
    fi
done

# ----------------------------------------------------------------------------
# Step 4: Start Frontend
# ----------------------------------------------------------------------------
if [[ "$START_FRONTEND" == true ]]; then
    print_step "Starting frontend..."

    if [[ -d "frontend" ]]; then
        cd "$PROJECT_ROOT/frontend"

        # Check if node_modules exists
        if [[ ! -d "node_modules" ]]; then
            print_warning "Installing frontend dependencies..."
            npm install
        fi

        log_file="$LOG_DIR/frontend.log"

        print_info "Starting frontend dev server on port 5173..."
        nohup npm run dev > "$log_file" 2>&1 &
        pid=$!

        # Save PID
        echo "frontend:${pid}:5173" >> "$PID_FILE"

        # Wait for frontend to start
        sleep 3
        if kill -0 $pid 2>/dev/null; then
            print_success "Frontend started (PID: ${pid}, Port: 5173)"
        else
            print_error "Frontend failed to start. Check log: ${log_file}"
        fi

        cd "$PROJECT_ROOT"
    else
        print_warning "Frontend directory not found"
    fi
else
    print_info "Skipping frontend (--no-frontend flag set)"
fi

# ----------------------------------------------------------------------------
# Step 5: Display Summary
# ----------------------------------------------------------------------------
print_header "Services Started"

echo -e "${BOLD}Running Services:${NC}\n"

# Read PID file and display status
if [[ -f "$PID_FILE" ]]; then
    while IFS=: read -r service pid port; do
        if kill -0 $pid 2>/dev/null; then
            status="${GREEN}Running${NC}"
            echo -e "  ${GREEN}✓${NC} ${BOLD}${service}${NC}"
            echo -e "    PID:  ${pid}"
            echo -e "    Port: ${port}"
            echo -e "    URL:  http://localhost:${port}"
            echo -e "    Log:  ${LOG_DIR}/${service}.log"
            echo ""
        else
            status="${RED}Stopped${NC}"
            echo -e "  ${RED}✗${NC} ${BOLD}${service}${NC} (failed to start)"
            echo ""
        fi
    done < "$PID_FILE"
fi

echo -e "${BOLD}Health Check URLs:${NC}"
echo -e "  API Gateway:  curl http://localhost:8080/health"
echo -e "  Auth Service: curl http://localhost:8081/health"
echo ""

echo -e "${BOLD}Management:${NC}"
echo -e "  Stop all services: ${CYAN}./scripts/stop-services.sh${NC}"
echo -e "  View logs:         ${CYAN}tail -f ${LOG_DIR}/<service>.log${NC}"
echo -e "  Check status:      ${CYAN}ps aux | grep target/debug${NC}"
echo ""

echo -e "${BOLD}PID File:${NC} ${PID_FILE}"
echo ""

print_success "All services started successfully!"
print_info "Use './scripts/stop-services.sh' to stop all services"

exit 0
