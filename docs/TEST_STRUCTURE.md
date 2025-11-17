# Test Structure Overview

```
llm-governance-dashboard/
│
├── services/                           # Backend Microservices
│   ├── auth-service/
│   │   └── tests/                     [6 files, ~40 tests]
│   │       ├── auth_handlers_test.rs  # Login/Registration endpoints
│   │       ├── jwt_service_test.rs    # JWT generation/validation
│   │       ├── mfa_service_test.rs    # TOTP/Backup codes
│   │       ├── oauth_service_test.rs  # OAuth (Google, GitHub)
│   │       ├── rate_limit_test.rs     # Rate limiting
│   │       └── integration_test.rs    # Auth flows
│   │
│   ├── policy-service/
│   │   └── tests/                     [3 files, ~25 tests]
│   │       ├── policy_handlers_test.rs       # CRUD operations
│   │       ├── policy_evaluation_test.rs     # Policy logic
│   │       └── policy_enforcement_test.rs    # Enforcement
│   │
│   ├── cost-service/
│   │   └── tests/                     [3 files, ~25 tests]
│   │       ├── cost_calculation_test.rs      # Cost calculations
│   │       ├── budget_tracking_test.rs       # Budget limits
│   │       └── usage_aggregation_test.rs     # Aggregations
│   │
│   └── user-service/
│       └── tests/                     [3 files, ~25 tests]
│           ├── user_management_test.rs       # User CRUD
│           ├── role_management_test.rs       # RBAC
│           └── team_management_test.rs       # Teams
│
├── tests/                             # Cross-Cutting Tests
│   ├── integration/                   [4 files, ~30 tests]
│   │   ├── api_gateway_test.rs       # Request routing
│   │   ├── database_integration_test.rs  # DB operations
│   │   ├── redis_integration_test.rs     # Caching
│   │   └── multi_service_test.rs         # Multi-service flows
│   │
│   ├── performance/                   [4 files, 4 scenarios]
│   │   ├── auth-load-test.js         # Auth performance
│   │   ├── api-load-test.js          # API load testing
│   │   ├── policy-evaluation-test.js # Policy performance
│   │   ├── rate-limit-test.js        # Rate limit verification
│   │   └── README.md
│   │
│   └── security/                      [7 files, ~50 tests]
│       ├── sql-injection-test.rs     # SQL injection
│       ├── xss-test.rs               # XSS protection
│       ├── csrf-test.rs              # CSRF protection
│       ├── auth-bypass-test.rs       # Auth bypass prevention
│       ├── authz-bypass-test.rs      # Authz bypass prevention
│       ├── input-validation-test.rs  # Input validation
│       ├── security-headers-test.rs  # Security headers
│       └── README.md
│
├── frontend/                          # Frontend Tests
│   ├── src/lib/
│   │   ├── utils/                    [3 test files]
│   │   │   ├── formatters.test.ts    # Formatting utilities
│   │   │   ├── validators.test.ts    # Validation utilities
│   │   │   └── date.test.ts          # Date utilities
│   │   ├── api/
│   │   │   └── client.test.ts        # API client
│   │   ├── stores/
│   │   │   └── auth.test.ts          # Auth store
│   │   └── components/__tests__/
│   │       └── Button.test.ts        # Button component
│   │
│   ├── src/routes/
│   │   ├── (auth)/login/__tests__/
│   │   │   └── page.test.ts          # Login page
│   │   └── (app)/dashboard/__tests__/
│   │       └── page.test.ts          # Dashboard page
│   │
│   ├── tests/e2e/                    [5 files, ~35 tests]
│   │   ├── auth.spec.ts              # Auth flows
│   │   ├── dashboard.spec.ts         # Dashboard
│   │   ├── policies.spec.ts          # Policy management
│   │   ├── audit-logs.spec.ts        # Audit logs
│   │   └── costs.spec.ts             # Cost tracking
│   │
│   ├── vitest.config.ts              # Vitest configuration
│   ├── vitest.setup.ts               # Test setup
│   └── playwright.config.ts          # Playwright configuration
│
├── .github/workflows/                 # CI/CD Workflows
│   ├── backend-tests.yml             # Backend CI
│   ├── frontend-tests.yml            # Frontend CI
│   ├── security-tests.yml            # Security CI
│   ├── performance-tests.yml         # Performance CI
│   └── test-summary.yml              # Test reporting
│
└── docs/                              # Documentation
    ├── TESTING.md                     # Comprehensive testing guide
    ├── TEST_REPORT.md                 # Implementation report
    └── TESTING_QUICK_START.md         # Quick reference
```

## Test Coverage Matrix

| Component | Unit Tests | Integration Tests | E2E Tests | Performance Tests | Security Tests |
|-----------|-----------|-------------------|-----------|-------------------|----------------|
| Auth Service | ✓ (40) | ✓ (included) | ✓ (8) | ✓ (auth-load) | ✓ (auth-bypass) |
| Policy Service | ✓ (25) | ✓ (multi-service) | ✓ (7) | ✓ (policy-eval) | ✓ (enforcement) |
| Cost Service | ✓ (25) | - | ✓ (6) | - | ✓ (calculation) |
| User Service | ✓ (25) | ✓ (database) | - | - | ✓ (authz-bypass) |
| API Gateway | - | ✓ (7) | - | ✓ (api-load) | ✓ (rate-limit) |
| Database | - | ✓ (9) | - | - | ✓ (sql-injection) |
| Redis | - | ✓ (7) | - | - | - |
| Frontend UI | ✓ (40) | - | ✓ (35) | ✓ (Lighthouse) | ✓ (XSS, CSRF) |

## Test Types by Purpose

### 1. Functional Testing
- **Unit Tests**: Test individual functions in isolation
  - Backend: Rust cargo test
  - Frontend: Vitest
  - Total: ~180 tests

- **Integration Tests**: Test service interactions
  - Database integration
  - Redis integration
  - Multi-service workflows
  - Total: ~30 tests

- **Component Tests**: Test UI components
  - Svelte components with Testing Library
  - User interactions
  - Total: ~20 tests

- **E2E Tests**: Test complete user workflows
  - Playwright across 5 browsers
  - Critical user journeys
  - Total: ~35 tests

### 2. Non-Functional Testing
- **Performance Tests**: Load and stress testing
  - k6 load tests
  - Response time SLOs
  - Throughput testing
  - 4 test scenarios

- **Security Tests**: Vulnerability scanning
  - OWASP Top 10 coverage
  - Penetration testing
  - Dependency scanning
  - Total: ~50 tests

## Test Execution Flow

```
Developer Push/PR
       │
       ├──> Backend Tests Workflow
       │    ├── Unit tests (all services)
       │    ├── Clippy linting
       │    ├── Format check
       │    ├── Integration tests (Docker)
       │    └── Coverage report (80%+ threshold)
       │
       ├──> Frontend Tests Workflow
       │    ├── Unit tests (Vitest)
       │    ├── Component tests
       │    ├── E2E tests (Playwright)
       │    ├── Type checking
       │    └── Coverage report (80%+ threshold)
       │
       ├──> Security Tests Workflow
       │    ├── Cargo audit
       │    ├── npm audit
       │    ├── Trivy scan
       │    └── Security tests
       │
       └──> Performance Tests Workflow (weekly)
            ├── k6 load tests
            ├── Lighthouse audit
            └── OWASP ZAP scan
```

## Quick Command Reference

```bash
# Backend Tests
cargo test --workspace                    # All unit tests
cargo test --test integration -- --ignored  # Integration tests
cargo tarpaulin --workspace               # Coverage report

# Frontend Tests
npm test                                  # Unit tests
npm run test:coverage                     # With coverage
npm run test:e2e                          # E2E tests

# Performance Tests
k6 run tests/performance/api-load-test.js

# Security Tests
cargo test --test security -- --ignored
cargo audit && npm audit
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080
```

## Coverage Goals

- **Overall**: 80%+ code coverage
- **Critical Services** (auth, policy, cost): 90%+
- **Frontend Components**: 85%+
- **Critical User Paths**: 100%

## Test Data & Fixtures

Test data is generated using:
- **Backend**: `fake` crate for realistic data
- **Frontend**: Factory functions for consistent test data
- **Integration**: `testcontainers` for isolated databases

## Continuous Improvement

- Add mutation testing with `cargo-mutants`
- Add visual regression testing with Percy/Chromatic
- Add API contract testing with Pact
- Expand E2E test coverage
- Add chaos engineering tests
