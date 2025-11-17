# Testing Documentation

Comprehensive testing guide for the LLM Governance Dashboard.

## Table of Contents

1. [Overview](#overview)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Integration Testing](#integration-testing)
5. [E2E Testing](#e2e-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [CI/CD Integration](#cicd-integration)
9. [Coverage Requirements](#coverage-requirements)

## Overview

Our testing strategy follows a comprehensive approach:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test service interactions and database operations
- **Component Tests**: Test UI components with user interactions
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Load testing and performance benchmarking
- **Security Tests**: Security vulnerability scanning and penetration testing

### Test Coverage Goals

- Backend: 80%+ code coverage
- Frontend: 80%+ code coverage
- Critical paths: 100% coverage
- Security: OWASP Top 10 coverage

## Backend Testing

### Unit Tests

Located in `services/*/tests/` directories.

```bash
# Run all backend tests
cargo test --workspace

# Run tests for specific service
cd services/auth-service
cargo test

# Run tests with coverage
cargo tarpaulin --all-features --workspace --timeout 120
```

### Test Structure

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_name() {
        // Arrange
        let input = setup_test_data();

        // Act
        let result = function_under_test(input);

        // Assert
        assert_eq!(result, expected_value);
    }

    #[actix_rt::test]
    async fn test_async_function() {
        // Test async functions
    }
}
```

### Mocking

Using `mockall` for mocking:

```rust
use mockall::predicate::*;
use mockall::mock;

mock! {
    pub Database {
        async fn get_user(&self, id: Uuid) -> Result<User, Error>;
    }
}

#[test]
fn test_with_mock() {
    let mut mock_db = MockDatabase::new();
    mock_db.expect_get_user()
        .with(eq(user_id))
        .returning(|_| Ok(test_user()));

    // Use mock_db in test
}
```

### Integration Tests

Located in `tests/integration/`.

```bash
# Run integration tests (requires Docker)
cargo test --test integration -- --ignored

# Run specific integration test
cargo test --test database_integration_test -- --ignored
```

## Frontend Testing

### Unit Tests (Vitest)

Located alongside source files as `*.test.ts`.

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Component Tests

Using `@testing-library/svelte`:

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
  it('should render and handle click', async () => {
    const handleClick = vi.fn();
    render(Button, { props: { label: 'Click me', onClick: handleClick } });

    const button = screen.getByRole('button', { name: /click me/i });
    await fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Mocking API Calls

Using MSW (Mock Service Worker):

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json({ users: [] });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## E2E Testing

### Playwright Tests

Located in `frontend/tests/e2e/`.

```bash
cd frontend

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run on specific browser
npx playwright test --project=chromium

# Debug tests
npx playwright test --debug
```

### E2E Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /login/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## Performance Testing

### k6 Load Tests

Located in `tests/performance/`.

```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io/docs/getting-started/installation/

# Run load tests
k6 run tests/performance/api-load-test.js

# Run with custom configuration
k6 run --vus 100 --duration 5m tests/performance/api-load-test.js

# Run with environment variables
k6 run -e BASE_URL=https://api.example.com tests/performance/api-load-test.js
```

### Performance Metrics

- **Response Time**: p95 < 200ms, p99 < 500ms
- **Throughput**: 1000+ requests/second
- **Error Rate**: < 1%
- **Policy Evaluation**: p95 < 50ms

## Security Testing

### Security Test Suite

Located in `tests/security/`.

```bash
# Run security tests
cargo test --test security -- --ignored

# Run specific security test
cargo test --test sql_injection_tests -- --ignored
```

### OWASP ZAP Scanning

```bash
# Start application
docker-compose up -d

# Run ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:8080 \
  -r zap-report.html

# Run full scan
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:8080 \
  -r zap-full-report.html
```

### Dependency Scanning

```bash
# Rust dependencies
cargo audit

# Node dependencies
cd frontend && npm audit

# Container scanning
trivy image llm-governance-dashboard:latest
```

## CI/CD Integration

### GitHub Actions Workflows

- **Backend Tests**: `.github/workflows/backend-tests.yml`
- **Frontend Tests**: `.github/workflows/frontend-tests.yml`
- **Security Tests**: `.github/workflows/security-tests.yml`
- **Performance Tests**: `.github/workflows/performance-tests.yml`

### Running Locally

```bash
# Install act (GitHub Actions runner)
brew install act

# Run workflows locally
act -j unit-tests
act -j integration-tests
act -j e2e-tests
```

## Coverage Requirements

### Backend Coverage

- **Minimum**: 80% line coverage
- **Critical Services**: 90% coverage
  - auth-service
  - policy-service
  - cost-service

### Frontend Coverage

- **Minimum**: 80% line coverage
- **Components**: 85% coverage
- **Utilities**: 90% coverage

### Coverage Reports

```bash
# Backend coverage
cargo tarpaulin --out Html --output-dir coverage

# Frontend coverage
cd frontend && npm run test:coverage

# View reports
open coverage/index.html  # Backend
open frontend/coverage/index.html  # Frontend
```

## Best Practices

### Test Naming

- Use descriptive names: `test_should_create_user_with_valid_data`
- Follow AAA pattern: Arrange, Act, Assert
- One assertion per test when possible

### Test Data

- Use factories for test data generation
- Use unique identifiers to avoid conflicts
- Clean up test data after tests

### Async Testing

- Always await async operations
- Use proper timeouts
- Handle cleanup in finally blocks

### Mocking

- Mock external dependencies
- Don't mock what you don't own
- Verify mock interactions

### CI/CD

- Run fast tests first
- Fail fast on errors
- Cache dependencies
- Parallelize when possible

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in test configuration
   - Check for infinite loops or blocking operations

2. **Flaky tests**
   - Add proper waits for async operations
   - Avoid time-dependent assertions
   - Use deterministic test data

3. **Database conflicts**
   - Use isolated test databases
   - Clean up data between tests
   - Use transactions for rollback

## Resources

- [Rust Testing Documentation](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
