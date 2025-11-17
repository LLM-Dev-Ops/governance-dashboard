# Performance Tests

This directory contains k6 performance tests for the LLM Governance Dashboard.

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

### Basic Load Test
```bash
k6 run tests/performance/api-load-test.js
```

### Authentication Load Test
```bash
k6 run tests/performance/auth-load-test.js
```

### Policy Evaluation Performance Test
```bash
k6 run tests/performance/policy-evaluation-test.js
```

### Rate Limit Test
```bash
k6 run tests/performance/rate-limit-test.js
```

### With Custom Environment
```bash
k6 run -e BASE_URL=https://api.example.com tests/performance/api-load-test.js
```

### Generate HTML Report
```bash
k6 run --out json=test-results.json tests/performance/api-load-test.js
```

## Test Scenarios

### 1. Authentication Load Test (`auth-load-test.js`)
- Tests login and token refresh endpoints
- Ramps up from 10 to 100 concurrent users
- Thresholds: p95 < 200ms, p99 < 500ms

### 2. API Load Test (`api-load-test.js`)
- Tests various API endpoints under load
- Two scenarios: constant load and ramping load
- Tests user, policy, audit, cost, and usage endpoints
- Thresholds: p95 < 200ms, p99 < 500ms, error rate < 1%

### 3. Policy Evaluation Test (`policy-evaluation-test.js`)
- Tests policy evaluation performance
- Critical for real-time request processing
- Thresholds: p95 < 50ms, p99 < 100ms

### 4. Rate Limit Test (`rate-limit-test.js`)
- Tests rate limiting functionality
- 200 requests per second for 1 minute
- Verifies rate limit headers are present
- Expects 50%+ requests to hit rate limit

## SLOs (Service Level Objectives)

- **Response Time**: p95 < 200ms, p99 < 500ms
- **Error Rate**: < 1%
- **Availability**: 99.9%
- **Policy Evaluation**: p95 < 50ms, p99 < 100ms

## Interpreting Results

k6 provides detailed metrics:
- `http_req_duration`: Total request duration
- `http_req_waiting`: Time waiting for response
- `http_req_sending`: Time sending request
- `http_req_receiving`: Time receiving response
- `http_reqs`: Total number of HTTP requests
- `vus`: Number of virtual users
- `vus_max`: Maximum number of virtual users

Custom metrics:
- `errors`: Error rate
- `response_time`: Response time trend
- `policy_evaluation_time`: Policy evaluation time
- `rate_limit_hits`: Rate limit hit rate
