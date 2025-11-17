#!/usr/bin/env bash

# ============================================================================
# run-performance-tests.sh - Performance Testing Script
# ============================================================================
# Runs k6 load tests and generates reports
# Usage: ./scripts/run-performance-tests.sh [--scenario SCENARIO] [--duration DURATION]
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

# Default options
SCENARIO="load"
DURATION="30s"
VUS="10"
RESULTS_DIR="$PROJECT_ROOT/performance-results"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --scenario)
            SCENARIO="$2"
            shift 2
            ;;
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --vus)
            VUS="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--scenario SCENARIO] [--duration DURATION] [--vus VUS]"
            echo "Scenarios: load, stress, spike, soak"
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
# Performance Testing
# ============================================================================

print_header "Performance Testing - k6 Load Tests"

echo -e "${BOLD}Configuration:${NC}"
echo -e "  Scenario:  ${SCENARIO}"
echo -e "  Duration:  ${DURATION}"
echo -e "  VUs:       ${VUS}"
echo -e "  Results:   ${RESULTS_DIR}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULT_FILE="$RESULTS_DIR/${SCENARIO}_${TIMESTAMP}.json"

# ----------------------------------------------------------------------------
# Step 1: Check Prerequisites
# ----------------------------------------------------------------------------
print_step "Checking prerequisites..."

if ! command -v k6 &> /dev/null; then
    print_error "k6 not found. Installing..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
            echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
            sudo apt-get update
            sudo apt-get install k6
        else
            print_error "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
            exit 1
        fi
    fi
fi

print_success "k6 is installed"

# ----------------------------------------------------------------------------
# Step 2: Check Services
# ----------------------------------------------------------------------------
print_step "Checking if services are running..."

API_GATEWAY_URL="http://localhost:8080"

if curl -sf "${API_GATEWAY_URL}/health" > /dev/null 2>&1; then
    print_success "API Gateway is running"
else
    print_warning "API Gateway not responding. Starting services..."

    if [[ -f "scripts/start-services.sh" ]]; then
        bash scripts/start-services.sh --build
        sleep 10
    else
        print_error "Cannot start services. Please start them manually."
        exit 1
    fi
fi

# ----------------------------------------------------------------------------
# Step 3: Create k6 Test Script
# ----------------------------------------------------------------------------
print_step "Creating k6 test script..."

K6_SCRIPT="$RESULTS_DIR/test_${SCENARIO}_${TIMESTAMP}.js"

cat > "$K6_SCRIPT" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const apiRequests = new Counter('api_requests');

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:8080';

export default function () {
  // Health check
  let res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health check status is 200': (r) => r.status === 200,
  });
  errorRate.add(res.status !== 200);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);

  sleep(1);

  // API Gateway endpoints
  res = http.get(`${BASE_URL}/api/v1/policies`);
  check(res, {
    'policies endpoint status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });
  errorRate.add(res.status >= 500);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);

  sleep(1);

  // Metrics endpoint
  res = http.get(`${BASE_URL}/metrics`);
  check(res, {
    'metrics endpoint responds': (r) => r.status < 500,
  });
  errorRate.add(res.status >= 500);
  apiLatency.add(res.timings.duration);
  apiRequests.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}
EOF

print_success "k6 test script created"

# ----------------------------------------------------------------------------
# Step 4: Run k6 Tests
# ----------------------------------------------------------------------------
print_step "Running k6 performance tests..."

print_info "Test scenario: ${SCENARIO}"
print_info "This may take a few minutes..."

if k6 run --out json="$RESULT_FILE" "$K6_SCRIPT"; then
    print_success "k6 tests completed"
else
    print_error "k6 tests failed"
    exit 1
fi

# ----------------------------------------------------------------------------
# Step 5: Generate HTML Report
# ----------------------------------------------------------------------------
print_step "Generating HTML report..."

HTML_REPORT="$RESULTS_DIR/report_${SCENARIO}_${TIMESTAMP}.html"

cat > "$HTML_REPORT" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
        .metric-name { font-weight: bold; color: #333; }
        .metric-value { font-size: 24px; color: #4CAF50; margin: 5px 0; }
        .passed { color: #4CAF50; }
        .failed { color: #f44336; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #4CAF50; color: white; }
        tr:hover { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Performance Test Report</h1>
        <p><strong>Scenario:</strong> SCENARIO_NAME</p>
        <p><strong>Timestamp:</strong> TIMESTAMP_VALUE</p>
        <p><strong>Duration:</strong> DURATION_VALUE</p>

        <h2>Summary</h2>
        <div class="metric">
            <div class="metric-name">Total Requests</div>
            <div class="metric-value">-</div>
        </div>
        <div class="metric">
            <div class="metric-name">Requests/sec</div>
            <div class="metric-value">-</div>
        </div>
        <div class="metric">
            <div class="metric-name">Average Response Time</div>
            <div class="metric-value">- ms</div>
        </div>
        <div class="metric">
            <div class="metric-name">Error Rate</div>
            <div class="metric-value">- %</div>
        </div>

        <h2>Response Time Percentiles</h2>
        <table>
            <tr>
                <th>Percentile</th>
                <th>Response Time (ms)</th>
            </tr>
            <tr><td>P50</td><td>-</td></tr>
            <tr><td>P90</td><td>-</td></tr>
            <tr><td>P95</td><td>-</td></tr>
            <tr><td>P99</td><td>-</td></tr>
        </table>

        <h2>Test Details</h2>
        <p>For detailed results, see the JSON output file.</p>
    </div>
</body>
</html>
EOF

# Replace placeholders
sed -i.bak "s/SCENARIO_NAME/${SCENARIO}/g" "$HTML_REPORT"
sed -i.bak "s/TIMESTAMP_VALUE/${TIMESTAMP}/g" "$HTML_REPORT"
sed -i.bak "s/DURATION_VALUE/${DURATION}/g" "$HTML_REPORT"
rm -f "${HTML_REPORT}.bak"

print_success "HTML report generated"

# ----------------------------------------------------------------------------
# Step 6: Display Results Summary
# ----------------------------------------------------------------------------
print_header "Performance Test Results"

echo -e "${BOLD}Test Summary:${NC}"
echo -e "  Scenario:     ${SCENARIO}"
echo -e "  Duration:     ${DURATION}"
echo -e "  Virtual Users:${VUS}"
echo ""

echo -e "${BOLD}Results Files:${NC}"
echo -e "  JSON:    ${CYAN}${RESULT_FILE}${NC}"
echo -e "  HTML:    ${CYAN}${HTML_REPORT}${NC}"
echo -e "  Script:  ${CYAN}${K6_SCRIPT}${NC}"
echo ""

# Extract some basic metrics from the JSON if possible
if command -v jq &> /dev/null && [[ -f "$RESULT_FILE" ]]; then
    print_info "Extracting metrics..."

    # Count total checks
    TOTAL_CHECKS=$(grep -c '"type":"Point"' "$RESULT_FILE" 2>/dev/null || echo "0")
    echo -e "  Total data points: ${TOTAL_CHECKS}"
fi

echo ""
echo -e "${BOLD}View Report:${NC}"
echo -e "  Open in browser: ${CYAN}file://${HTML_REPORT}${NC}"
echo ""

echo -e "${BOLD}Next Steps:${NC}"
echo -e "  Run stress test:  ${CYAN}./scripts/run-performance-tests.sh --scenario stress${NC}"
echo -e "  View all results: ${CYAN}ls -lh ${RESULTS_DIR}${NC}"
echo ""

print_success "Performance testing completed!"

exit 0
