# Security Tests

This directory contains security tests for the LLM Governance Dashboard following OWASP best practices.

## Test Categories

### 1. SQL Injection Tests (`sql-injection-test.rs`)
- Tests for SQL injection vulnerabilities in all input fields
- Verifies parameterized queries are used
- Tests common SQL injection payloads

### 2. XSS Tests (`xss-test.rs`)
- Tests for Cross-Site Scripting vulnerabilities
- Verifies HTML encoding and sanitization
- Tests Content-Security-Policy headers
- Tests XSS in various contexts (stored, reflected, DOM-based)

### 3. CSRF Tests (`csrf-test.rs`)
- Tests CSRF token validation
- Verifies state-changing operations require CSRF protection
- Tests SameSite cookie attribute

### 4. Authentication Bypass Tests (`auth-bypass-test.rs`)
- Tests for authentication bypass vulnerabilities
- Tests JWT token validation
- Tests session management
- Tests brute force protection

### 5. Authorization Bypass Tests (`authz-bypass-test.rs`)
- Tests for horizontal privilege escalation
- Tests for vertical privilege escalation
- Tests RBAC enforcement
- Tests IDOR vulnerabilities
- Tests team/organization isolation

### 6. Input Validation Tests (`input-validation-test.rs`)
- Tests input validation and sanitization
- Tests length limits
- Tests format validation
- Tests special character handling

### 7. Security Headers Tests (`security-headers-test.rs`)
- Tests security headers are properly set
- Tests CSP, HSTS, X-Frame-Options, etc.
- Tests secure cookie flags

## Running Security Tests

### Run all security tests
```bash
cargo test --test security -- --ignored
```

### Run specific test category
```bash
cargo test --test sql_injection_tests -- --ignored
```

### Run with OWASP ZAP (recommended)
```bash
# Start the application
docker-compose up -d

# Run ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:8080 \
  -r zap-report.html
```

## Security Checklist

- [ ] SQL Injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Authentication bypass prevention
- [ ] Authorization bypass prevention
- [ ] Input validation
- [ ] Security headers
- [ ] Rate limiting
- [ ] Password hashing (bcrypt/argon2)
- [ ] Secure session management
- [ ] HTTPS enforcement
- [ ] Secure cookie flags
- [ ] Content-Security-Policy
- [ ] CORS configuration
- [ ] Error message sanitization
- [ ] File upload validation
- [ ] API versioning
- [ ] Dependency scanning
- [ ] Secret management

## OWASP Top 10 Coverage

1. ✓ Broken Access Control
2. ✓ Cryptographic Failures
3. ✓ Injection
4. ✓ Insecure Design
5. ✓ Security Misconfiguration
6. ✓ Vulnerable and Outdated Components
7. ✓ Identification and Authentication Failures
8. ✓ Software and Data Integrity Failures
9. ✓ Security Logging and Monitoring Failures
10. ✓ Server-Side Request Forgery (SSRF)

## Automated Security Scanning

### OWASP ZAP
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080
```

### Trivy (Dependency Scanning)
```bash
trivy fs --security-checks vuln,config .
```

### Cargo Audit
```bash
cargo audit
```

### npm audit (Frontend)
```bash
cd frontend && npm audit
```

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of opening a public issue.
