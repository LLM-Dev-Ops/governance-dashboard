# Testing Quick Start Guide

Quick reference for running tests in the LLM Governance Dashboard.

## Prerequisites

### Backend Testing
```bash
# Rust toolchain (already installed)
rustc --version

# Install cargo-tarpaulin for coverage
cargo install cargo-tarpaulin

# Install cargo-audit for security scanning
cargo install cargo-audit
```

### Frontend Testing
```bash
cd frontend

# Install dependencies
npm install

# Verify Playwright installation
npx playwright install --with-deps
```

### Performance Testing
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

## Quick Commands

### Backend Tests

```bash
# Run all backend tests
cargo test --workspace

# Run specific service tests
cd services/auth-service && cargo test

# Run with verbose output
cargo test --workspace -- --nocapture

# Run integration tests (requires Docker)
docker-compose up -d postgres redis
cargo test --test integration -- --ignored

# Run security tests
cargo test --test security -- --ignored

# Generate coverage report
cargo tarpaulin --all-features --workspace --out Html --output-dir coverage

# Run security audit
cargo audit
```

### Frontend Tests

```bash
cd frontend

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E on specific browser
npx playwright test --project=chromium

# Debug E2E tests
npx playwright test --debug
```

### Performance Tests

```bash
# Run auth load test
k6 run tests/performance/auth-load-test.js

# Run API load test
k6 run tests/performance/api-load-test.js

# Run policy evaluation test
k6 run tests/performance/policy-evaluation-test.js

# Run rate limit test
k6 run tests/performance/rate-limit-test.js

# Run with custom VUs and duration
k6 run --vus 100 --duration 5m tests/performance/api-load-test.js

# Run with custom base URL
k6 run -e BASE_URL=https://api.example.com tests/performance/api-load-test.js
```

### Security Tests

```bash
# Run Rust security tests
cargo test --test security -- --ignored

# Run dependency audit
cargo audit
cd frontend && npm audit

# Run OWASP ZAP baseline scan
docker-compose up -d
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:8080 \
  -r zap-report.html

# Run Trivy scan
trivy fs --security-checks vuln,config .
```

## Test File Locations

### Backend Tests
```
services/
├── auth-service/tests/
│   ├── auth_handlers_test.rs
│   ├── jwt_service_test.rs
│   ├── mfa_service_test.rs
│   ├── oauth_service_test.rs
│   ├── rate_limit_test.rs
│   └── integration_test.rs
├── policy-service/tests/
│   ├── policy_handlers_test.rs
│   ├── policy_evaluation_test.rs
│   └── policy_enforcement_test.rs
├── cost-service/tests/
│   ├── cost_calculation_test.rs
│   ├── budget_tracking_test.rs
│   └── usage_aggregation_test.rs
└── user-service/tests/
    ├── user_management_test.rs
    ├── role_management_test.rs
    └── team_management_test.rs
```

### Frontend Tests
```
frontend/
├── src/lib/
│   ├── utils/
│   │   ├── formatters.test.ts
│   │   ├── validators.test.ts
│   │   └── date.test.ts
│   ├── api/client.test.ts
│   ├── stores/auth.test.ts
│   └── components/__tests__/Button.test.ts
├── src/routes/
│   ├── (auth)/login/__tests__/page.test.ts
│   └── (app)/dashboard/__tests__/page.test.ts
└── tests/e2e/
    ├── auth.spec.ts
    ├── dashboard.spec.ts
    ├── policies.spec.ts
    ├── audit-logs.spec.ts
    └── costs.spec.ts
```

### Integration & Performance Tests
```
tests/
├── integration/
│   ├── api_gateway_test.rs
│   ├── database_integration_test.rs
│   ├── redis_integration_test.rs
│   └── multi_service_test.rs
├── performance/
│   ├── auth-load-test.js
│   ├── api-load-test.js
│   ├── policy-evaluation-test.js
│   └── rate-limit-test.js
└── security/
    ├── sql-injection-test.rs
    ├── xss-test.rs
    ├── csrf-test.rs
    ├── auth-bypass-test.rs
    ├── authz-bypass-test.rs
    ├── input-validation-test.rs
    └── security-headers-test.rs
```

## Coverage Thresholds

- **Backend**: 80%+ code coverage
- **Frontend**: 80%+ code coverage
- **Critical Paths**: 100% coverage

## Common Issues

### Tests Timing Out
```bash
# Increase timeout for backend tests
cargo test -- --test-threads=1 --timeout 300

# Increase timeout for frontend tests (in vitest.config.ts)
# testTimeout: 10000
```

### Database Connection Issues
```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Check connection
psql -h localhost -U test_user -d test_db
```

### Playwright Browser Issues
```bash
# Reinstall browsers
npx playwright install --with-deps chromium firefox webkit
```

## CI/CD

Tests are automatically run on:
- Push to `main` or `develop` branches
- Pull requests
- Weekly scheduled runs (security & performance)

View test results in GitHub Actions:
```
https://github.com/your-org/llm-governance-dashboard/actions
```

## Test Data

### Creating Test Fixtures
```rust
// Rust
fn create_test_user() -> User {
    User {
        id: Uuid::new_v4(),
        email: "test@example.com".to_string(),
        name: "Test User".to_string(),
        created_at: Utc::now(),
    }
}
```

```typescript
// TypeScript
const createTestUser = () => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date().toISOString(),
});
```

## Getting Help

- **Documentation**: See `docs/TESTING.md` for comprehensive guide
- **Performance**: See `tests/performance/README.md`
- **Security**: See `tests/security/README.md`
- **Test Report**: See `TEST_REPORT.md` for implementation details

## Quick Health Check

Run this to verify your testing environment:

```bash
#!/bin/bash

echo "Checking testing environment..."

# Backend
echo "✓ Rust tests"
cargo test --workspace --no-fail-fast || echo "❌ Rust tests failed"

# Frontend
echo "✓ Frontend tests"
cd frontend && npm test || echo "❌ Frontend tests failed"

# Coverage tools
echo "✓ Coverage tools"
cargo tarpaulin --version || echo "❌ Install: cargo install cargo-tarpaulin"

# E2E
echo "✓ Playwright"
npx playwright --version || echo "❌ Install: npm install"

# Performance
echo "✓ k6"
k6 version || echo "❌ Install k6"

# Security
echo "✓ Security tools"
cargo audit --version || echo "❌ Install: cargo install cargo-audit"

echo "Environment check complete!"
```

Save this as `check-test-env.sh` and run it to verify your setup.
