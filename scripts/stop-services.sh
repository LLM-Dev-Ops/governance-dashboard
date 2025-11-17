#!/usr/bin/env bash

# ============================================================================
# stop-services.sh - Stop All Services
# ============================================================================
# Stops all running backend services and frontend
# Usage: ./scripts/stop-services.sh [--keep-db]
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Log directory
LOG_DIR="$PROJECT_ROOT/logs/services"
PID_FILE="$LOG_DIR/services.pid"

# Options
KEEP_DATABASE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-db)
            KEEP_DATABASE=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--keep-db]"
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
# Stop Services
# ============================================================================

print_header "Stopping All Services"

# ----------------------------------------------------------------------------
# Step 1: Stop Services from PID File
# ----------------------------------------------------------------------------
if [[ -f "$PID_FILE" ]]; then
    print_step "Stopping services from PID file..."

    while IFS=: read -r service pid port; do
        if [[ -n "$pid" ]]; then
            print_info "Stopping ${service} (PID: ${pid})..."

            if kill -0 $pid 2>/dev/null; then
                # Try graceful shutdown first
                if kill -TERM $pid 2>/dev/null; then
                    # Wait up to 10 seconds for graceful shutdown
                    for i in {1..10}; do
                        if ! kill -0 $pid 2>/dev/null; then
                            break
                        fi
                        sleep 1
                    done

                    # Force kill if still running
                    if kill -0 $pid 2>/dev/null; then
                        print_warning "Force killing ${service}..."
                        kill -9 $pid 2>/dev/null || true
                    fi

                    print_success "${service} stopped"
                else
                    print_warning "${service} (PID: ${pid}) could not be stopped"
                fi
            else
                print_info "${service} (PID: ${pid}) not running"
            fi
        fi
    done < "$PID_FILE"

    # Remove PID file
    rm -f "$PID_FILE"
    print_success "PID file removed"
else
    print_warning "PID file not found: ${PID_FILE}"
fi

# ----------------------------------------------------------------------------
# Step 2: Kill Any Remaining Processes
# ----------------------------------------------------------------------------
print_step "Cleaning up any remaining processes..."

# Kill any remaining service processes
for service in auth-service user-service policy-service audit-service metrics-service cost-service api-gateway integration-service; do
    if pgrep -f "target/debug/${service}" > /dev/null; then
        print_info "Found remaining ${service} processes..."
        pkill -f "target/debug/${service}" || true
        print_success "${service} processes killed"
    fi
done

# Kill frontend dev server
if pgrep -f "vite" > /dev/null; then
    print_info "Stopping Vite dev server..."
    pkill -f "vite" || true
    print_success "Frontend dev server stopped"
fi

# ----------------------------------------------------------------------------
# Step 3: Stop Database Services (Optional)
# ----------------------------------------------------------------------------
if [[ "$KEEP_DATABASE" == false ]]; then
    print_step "Stopping database services..."

    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        if [[ -f "docker-compose.yml" ]]; then
            print_info "Stopping PostgreSQL and Redis..."

            if docker compose stop postgres redis 2>/dev/null || docker-compose stop postgres redis 2>/dev/null; then
                print_success "Database services stopped"
            else
                print_warning "Failed to stop database services"
            fi
        fi
    fi
else
    print_info "Keeping database services running (--keep-db flag set)"
fi

# ----------------------------------------------------------------------------
# Step 4: Summary
# ----------------------------------------------------------------------------
print_header "Cleanup Complete"

echo -e "${BOLD}Status:${NC}"
echo -e "  All application services stopped"

if [[ "$KEEP_DATABASE" == false ]]; then
    echo -e "  Database services stopped"
else
    echo -e "  Database services still running"
fi

echo ""

echo -e "${BOLD}Next Steps:${NC}"
echo -e "  Start services: ${CYAN}./scripts/start-services.sh${NC}"
echo -e "  Clean logs:     ${CYAN}rm -rf logs/services/*.log${NC}"

if [[ "$KEEP_DATABASE" == false ]]; then
    echo -e "  Start DB only:  ${CYAN}docker compose up -d postgres redis${NC}"
fi

echo ""

print_success "All services stopped successfully!"

exit 0
