# LLM Governance Dashboard - API Documentation

Complete production-grade API documentation for all 8 microservices.

---

## Quick Links

### Getting Started
- [API Documentation](./API_DOCUMENTATION.md) - Overview, authentication, common patterns
- [API Reference](./API_REFERENCE.md) - Complete endpoint reference
- [Authentication Guide](./AUTHENTICATION_GUIDE.md) - JWT, OAuth2, MFA flows
- [Integration Guide](./INTEGRATION_GUIDE.md) - SDKs and code examples

### Advanced Topics
- [Webhooks](./WEBHOOKS.md) - Real-time event notifications
- [API Changelog](./API_CHANGELOG.md) - Version history and breaking changes

### Machine-Readable Specs
- [OpenAPI Specifications](./openapi/) - 8 OpenAPI 3.0 spec files
- [Postman Collection](./postman_collection.json) - Import into Postman

---

## Documentation Files

### Core API Documentation (NEW)

| File | Size | Description |
|------|------|-------------|
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | 17KB | Master API documentation with overview of all 8 services |
| [API_REFERENCE.md](./API_REFERENCE.md) | 27KB | Detailed reference for 60+ endpoints |
| [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) | 28KB | Complete authentication flows and security |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | 19KB | SDKs, code examples, best practices |
| [WEBHOOKS.md](./WEBHOOKS.md) | 14KB | Webhook events and implementation |
| [API_CHANGELOG.md](./API_CHANGELOG.md) | 8.4KB | Version history and migration guides |

### OpenAPI Specifications (NEW)

| File | Size | Service | Endpoints |
|------|------|---------|-----------|
| [auth-service.yaml](./openapi/auth-service.yaml) | 23KB | Auth Service | 12 endpoints |
| [user-service.yaml](./openapi/user-service.yaml) | 11KB | User Service | 8+ endpoints |
| [policy-service.yaml](./openapi/policy-service.yaml) | 6.5KB | Policy Service | 8 endpoints |
| [audit-service.yaml](./openapi/audit-service.yaml) | 4.7KB | Audit Service | 6 endpoints |
| [metrics-service.yaml](./openapi/metrics-service.yaml) | 5.1KB | Metrics Service | 8 endpoints |
| [cost-service.yaml](./openapi/cost-service.yaml) | 5.4KB | Cost Service | 10 endpoints |
| [integration-service.yaml](./openapi/integration-service.yaml) | 5.4KB | Integration Service | 3 endpoints |
| [api-gateway.yaml](./openapi/api-gateway.yaml) | 2.2KB | API Gateway | 3 endpoints |

### Postman Collection (NEW)

| File | Size | Description |
|------|------|-------------|
| [postman_collection.json](./postman_collection.json) | 22KB | Complete Postman collection with all endpoints |

### Existing Documentation

| File | Size | Description |
|------|------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 97KB | System architecture and design |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 11KB | Deployment guides |
| [MONITORING.md](./MONITORING.md) | 11KB | Monitoring and observability |
| [SCALING.md](./SCALING.md) | 9.7KB | Scaling strategies |
| [TESTING.md](./TESTING.md) | 8.1KB | Testing documentation |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 8.6KB | Common issues and solutions |

---

## Service Documentation

### 1. Auth Service (Port 8081)
**Path:** `/api/v1/auth/*`

Features:
- User registration and email verification
- JWT authentication
- Multi-factor authentication (TOTP)
- OAuth2 (Google, GitHub)
- Password reset flow
- Session management

**Endpoints:** 12
**OpenAPI Spec:** [auth-service.yaml](./openapi/auth-service.yaml)

---

### 2. User Service (Port 8082)
**Path:** `/api/v1/users/*`

Features:
- User CRUD operations
- Role-based access control (RBAC)
- Permission management
- Role hierarchy
- Team membership

**Endpoints:** 8+
**OpenAPI Spec:** [user-service.yaml](./openapi/user-service.yaml)

---

### 3. Policy Service (Port 8083)
**Path:** `/api/v1/policies/*`

Features:
- Policy CRUD operations
- Policy evaluation engine
- Multiple policy types (cost, security, compliance, usage, rate_limit, content_filter)
- Enforcement levels (strict, warning, monitor)
- Violation tracking

**Endpoints:** 8
**OpenAPI Spec:** [policy-service.yaml](./openapi/policy-service.yaml)

---

### 4. Audit Service (Port 8084)
**Path:** `/api/v1/audit/*`

Features:
- Immutable audit logging
- SHA-256 integrity verification
- Comprehensive querying
- Export to CSV/JSON
- Compliance reporting

**Endpoints:** 6
**OpenAPI Spec:** [audit-service.yaml](./openapi/audit-service.yaml)

---

### 5. Metrics Service (Port 8085)
**Path:** `/api/v1/metrics/*`

Features:
- Real-time and batch metric ingestion
- TimescaleDB time-series data
- Hourly and daily aggregations
- Usage statistics by provider/model
- Performance analytics

**Endpoints:** 8
**OpenAPI Spec:** [metrics-service.yaml](./openapi/metrics-service.yaml)

---

### 6. Cost Service (Port 8086)
**Path:** `/api/v1/costs/*`

Features:
- Real-time cost calculation
- Budget management (daily, weekly, monthly)
- Budget utilization tracking
- Cost forecasting
- Chargeback/showback reports

**Endpoints:** 10
**OpenAPI Spec:** [cost-service.yaml](./openapi/cost-service.yaml)

---

### 7. Integration Service (Port 8087)
**Path:** `/api/v1/integrations/*`

Features:
- LLM provider proxy (OpenAI, Anthropic, Google, Azure, Bedrock)
- Circuit breaker pattern
- Automatic token counting
- Policy enforcement
- Provider health monitoring

**Endpoints:** 3
**OpenAPI Spec:** [integration-service.yaml](./openapi/integration-service.yaml)

---

### 8. API Gateway (Port 8080)
**Path:** `/api/v1/*`

Features:
- Intelligent request routing
- JWT authentication middleware
- Rate limiting (per-user and per-IP)
- CORS support
- Health checks

**Endpoints:** 3
**OpenAPI Spec:** [api-gateway.yaml](./openapi/api-gateway.yaml)

---

## Quick Start

### 1. Import Postman Collection

```bash
# Import postman_collection.json into Postman
# Set environment variables:
# - base_url: https://api.llm-governance.example.com/api/v1
# - access_token: (obtained from login)
```

### 2. Register and Login

```bash
# Register
curl -X POST https://api.llm-governance.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"SecurePass123!","name":"Your Name"}'

# Login
curl -X POST https://api.llm-governance.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"SecurePass123!"}'
```

### 3. Make Authenticated Request

```bash
# Replace <access_token> with token from login response
curl -X GET https://api.llm-governance.example.com/api/v1/users \
  -H "Authorization: Bearer <access_token>"
```

---

## Using OpenAPI Specs

### Swagger UI

```bash
# Install Swagger UI
npm install -g swagger-ui-watcher

# View Auth Service spec
swagger-ui-watcher openapi/auth-service.yaml
```

### Code Generation

```bash
# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i openapi/auth-service.yaml \
  -g typescript-axios \
  -o generated/typescript

# Generate Python client
openapi-generator generate \
  -i openapi/auth-service.yaml \
  -g python \
  -o generated/python
```

---

## Documentation Standards

All API documentation follows these standards:

1. **OpenAPI 3.0** - Machine-readable specifications
2. **Examples** - Request/response examples for all endpoints
3. **Error Handling** - Documented error codes and responses
4. **Authentication** - Clear security requirements
5. **Versioning** - Semantic versioning (1.0.0)
6. **Code Examples** - JavaScript, Python, cURL examples
7. **Best Practices** - Security and performance guidelines

---

## API Statistics

- **Total Services:** 8 microservices
- **Total Endpoints:** 60+ RESTful endpoints
- **OpenAPI Specs:** 8 complete specifications
- **Documentation Pages:** 6 comprehensive guides
- **Code Examples:** 50+ working examples
- **File Size:** 140KB+ of documentation

---

## Support

- **API Support:** api-support@llm-governance.example.com
- **Documentation Issues:** docs@llm-governance.example.com
- **GitHub:** https://github.com/llm-governance/dashboard
- **Status:** https://status.llm-governance.example.com

---

## Contributing

Found an error or want to improve the documentation?

1. Open an issue: https://github.com/llm-governance/dashboard/issues
2. Submit a pull request with improvements
3. Email: docs@llm-governance.example.com

---

## License

Copyright © 2025 LLM Governance Dashboard

Documentation licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

**Last Updated:** November 16, 2025
**Version:** 1.0.0
