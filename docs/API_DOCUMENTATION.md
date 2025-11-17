# API Documentation

## Overview

The LLM Governance Dashboard provides a comprehensive RESTful API for managing and monitoring Large Language Model (LLM) usage across your organization. The platform consists of 8 microservices working together to provide authentication, policy management, cost tracking, audit logging, and LLM provider integration.

**Version:** 1.0.0
**Base URL:** `https://api.llm-governance.example.com/api/v1`
**Protocol:** HTTPS only
**Format:** JSON

---

## Architecture

### Microservices

| Service | Port | Description | Base Path |
|---------|------|-------------|-----------|
| **API Gateway** | 8080 | Central entry point, routing, auth | `/api/v1/*` |
| **Auth Service** | 8081 | Authentication, JWT, MFA, OAuth2 | `/api/v1/auth/*` |
| **User Service** | 8082 | User management, RBAC, teams | `/api/v1/users/*` |
| **Policy Service** | 8083 | Policy CRUD, evaluation engine | `/api/v1/policies/*` |
| **Audit Service** | 8084 | Immutable audit logs, compliance | `/api/v1/audit/*` |
| **Metrics Service** | 8085 | Time-series metrics, analytics | `/api/v1/metrics/*` |
| **Cost Service** | 8086 | Cost tracking, budgets, forecasting | `/api/v1/costs/*` |
| **Integration Service** | 8087 | LLM provider proxy, circuit breaker | `/api/v1/integrations/*` |

### Service Dependencies

```
┌─────────────┐
│ API Gateway │ (Entry Point)
└──────┬──────┘
       │
       ├──────► Auth Service
       ├──────► User Service
       ├──────► Policy Service
       ├──────► Audit Service
       ├──────► Metrics Service
       ├──────► Cost Service
       └──────► Integration Service
```

---

## Authentication

All API requests (except public endpoints) require authentication using JWT tokens.

### Authentication Methods

1. **JWT Bearer Token** (Primary)
2. **API Keys** (Service-to-service)
3. **OAuth2** (Google, GitHub)
4. **Multi-Factor Authentication (MFA)** (Optional)

### Getting Started

1. **Register a user account:**
   ```bash
   POST /api/v1/auth/register
   ```

2. **Login to obtain tokens:**
   ```bash
   POST /api/v1/auth/login
   ```

3. **Use the access token in subsequent requests:**
   ```bash
   Authorization: Bearer <access_token>
   ```

See [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) for detailed authentication flows.

---

## Common Headers

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Yes* | `Bearer <access_token>` |
| `X-API-Key` | No | API key for service authentication |
| `X-Request-ID` | No | Unique request identifier for tracing |
| `User-Agent` | Recommended | Client application identifier |

*Required for all authenticated endpoints

### Response Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | Always `application/json` |
| `X-Request-ID` | Echoed back from request or generated |
| `X-RateLimit-Limit` | Maximum requests allowed in window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

---

## Common Response Format

All API responses follow a standardized format:

### Success Response (2xx)

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "timestamp": "2025-11-16T12:00:00Z"
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email",
      "constraint": "required"
    }
  },
  "timestamp": "2025-11-16T12:00:00Z"
}
```

---

## HTTP Status Codes

### Success Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful GET, PUT, DELETE |
| `201` | Created | Successful POST creating resource |
| `202` | Accepted | Request accepted, processing async |
| `204` | No Content | Successful DELETE with no body |

### Client Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `400` | Bad Request | Invalid request format or validation error |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Authenticated but insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists or conflict |
| `422` | Unprocessable Entity | Valid format but semantic errors |
| `429` | Too Many Requests | Rate limit exceeded |

### Server Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `500` | Internal Server Error | Unexpected server error |
| `502` | Bad Gateway | Upstream service error |
| `503` | Service Unavailable | Service temporarily unavailable |
| `504` | Gateway Timeout | Upstream service timeout |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_FAILED` | 401 | Invalid credentials |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `TOKEN_INVALID` | 401 | JWT token is malformed or invalid |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `POLICY_VIOLATION` | 422 | Request violates policy |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Rate Limiting

To ensure fair usage and protect service availability, all API endpoints are rate-limited.

### Limits

| Tier | Requests per Minute | Requests per Hour | Requests per Day |
|------|---------------------|-------------------|------------------|
| **Free** | 60 | 1,000 | 10,000 |
| **Professional** | 600 | 20,000 | 500,000 |
| **Enterprise** | 6,000 | 200,000 | 5,000,000 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1700140800
```

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 30 seconds.",
    "details": {
      "limit": 60,
      "remaining": 0,
      "reset": 1700140800
    }
  }
}
```

### Best Practices

- Implement exponential backoff when receiving 429 responses
- Cache responses when possible
- Use batch endpoints for multiple operations
- Monitor rate limit headers to adjust request frequency

---

## Pagination

List endpoints support cursor-based and offset-based pagination.

### Offset-Based Pagination (Default)

**Request:**
```http
GET /api/v1/users?limit=20&offset=40
```

**Query Parameters:**
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 20 | 100 | Number of items per page |
| `offset` | integer | 0 | - | Number of items to skip |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "limit": 20,
    "offset": 40,
    "has_more": true
  }
}
```

### Cursor-Based Pagination

**Request:**
```http
GET /api/v1/metrics/query?limit=50&cursor=eyJpZCI6IjEyMyJ9
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of items per page |
| `cursor` | string | - | Pagination cursor from previous response |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "next_cursor": "eyJpZCI6IjE3MyJ9",
    "has_more": true
  }
}
```

---

## Filtering and Sorting

### Filtering

Most list endpoints support filtering through query parameters:

```http
GET /api/v1/policies?policy_type=cost&status=active
GET /api/v1/audit/logs?action=login&start_date=2025-11-01&end_date=2025-11-16
GET /api/v1/metrics/query?provider=openai&model=gpt-4
```

### Common Filter Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status | `active`, `inactive` |
| `created_after` | ISO 8601 | Created after timestamp | `2025-11-01T00:00:00Z` |
| `created_before` | ISO 8601 | Created before timestamp | `2025-11-16T23:59:59Z` |
| `search` | string | Full-text search | `search=policy` |

### Sorting

Sort results using the `sort` and `order` parameters:

```http
GET /api/v1/users?sort=created_at&order=desc
GET /api/v1/costs/team/123?sort=amount&order=asc
```

**Parameters:**
| Parameter | Type | Values | Default |
|-----------|------|--------|---------|
| `sort` | string | Field name | `created_at` |
| `order` | string | `asc`, `desc` | `desc` |

---

## Versioning

The API uses URL-based versioning:

```
https://api.llm-governance.example.com/api/v1/users
                                            ^^
                                          version
```

### Current Version

- **Current:** v1
- **Supported:** v1
- **Deprecated:** None

### Version Lifecycle

1. **Active** - Full support and new features
2. **Deprecated** - Supported but no new features (6 months notice)
3. **Sunset** - No longer supported (removed after deprecation period)

### Breaking Changes

Breaking changes will always result in a new API version. We guarantee:

- 6 months minimum support for deprecated versions
- 3 months advance notice before deprecation
- Migration guides for version upgrades

---

## Data Formats

### Date and Time

All timestamps use ISO 8601 format in UTC:

```json
{
  "created_at": "2025-11-16T12:00:00Z",
  "updated_at": "2025-11-16T14:30:00.123Z"
}
```

### UUIDs

Resource identifiers use UUID v4:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

### Currency

All monetary values are in USD with decimal precision:

```json
{
  "cost": 0.0123,
  "budget": 1000.00,
  "spent": 245.67
}
```

### Numbers

- **Integers:** No decimals (e.g., `42`, `1000`)
- **Floats:** Decimal precision (e.g., `3.14`, `0.001`)
- **Large numbers:** No thousands separators in JSON

---

## Security

### HTTPS Only

All API requests must use HTTPS. HTTP requests will be rejected.

### Authentication Security

- JWT tokens expire after 1 hour (3600 seconds)
- Refresh tokens expire after 7 days
- Passwords must be at least 8 characters
- MFA strongly recommended for admin accounts

### Data Protection

- Passwords are hashed using Argon2
- Sensitive data encrypted at rest
- PII redacted in logs
- Audit trail for all modifications

### Best Practices

1. **Never expose tokens** - Keep access tokens secure
2. **Use HTTPS** - Always use encrypted connections
3. **Rotate credentials** - Regularly rotate API keys and tokens
4. **Implement MFA** - Enable multi-factor authentication
5. **Monitor audit logs** - Review security events regularly
6. **Least privilege** - Use minimal required permissions

---

## Webhooks

The platform supports webhooks for real-time event notifications.

Supported events:
- User authentication events
- Policy violations
- Budget threshold alerts
- Cost anomalies
- Service health changes

See [WEBHOOKS.md](./WEBHOOKS.md) for detailed webhook documentation.

---

## SDKs and Client Libraries

### Official SDKs

- **JavaScript/TypeScript** - `@llm-governance/sdk-js`
- **Python** - `llm-governance-sdk`
- **Go** - `github.com/llm-governance/sdk-go`

### Example Usage

**JavaScript:**
```javascript
import { LLMGovernance } from '@llm-governance/sdk-js';

const client = new LLMGovernance({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.llm-governance.example.com/api/v1'
});

const users = await client.users.list({ limit: 10 });
```

**Python:**
```python
from llm_governance import Client

client = Client(
    api_key='your-api-key',
    base_url='https://api.llm-governance.example.com/api/v1'
)

users = client.users.list(limit=10)
```

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed SDK documentation.

---

## Service Endpoints Summary

### Auth Service (`/api/v1/auth/*`)
- User registration and email verification
- Login with JWT token generation
- Multi-factor authentication (TOTP)
- Password reset and change
- OAuth2 integration (Google, GitHub)
- Token refresh and session management

### User Service (`/api/v1/users/*`)
- User CRUD operations
- Role-based access control (RBAC)
- Permission management
- Team membership
- User profile management

### Policy Service (`/api/v1/policies/*`)
- Policy CRUD operations
- Policy evaluation engine
- Policy assignments (team/user)
- Violation tracking
- Multiple policy types (cost, security, compliance, usage)

### Audit Service (`/api/v1/audit/*`)
- Immutable audit log creation
- Log querying with filters
- Integrity verification (SHA-256)
- Export to CSV/JSON
- Compliance reporting

### Metrics Service (`/api/v1/metrics/*`)
- Real-time and batch metric ingestion
- Time-series data queries
- Hourly and daily aggregations
- Usage statistics by provider/model
- Performance analytics

### Cost Service (`/api/v1/costs/*`)
- Cost calculation per request
- Budget management (team/user)
- Cost forecasting
- Chargeback/showback reports
- Budget alerts and utilization tracking

### Integration Service (`/api/v1/integrations/*`)
- LLM request proxying
- Multi-provider support (OpenAI, Anthropic, Google, Azure, Bedrock)
- Circuit breaker for resilience
- Automatic token counting and cost calculation
- Provider health monitoring

### API Gateway (`/api/v1/*`)
- Intelligent routing to services
- JWT authentication middleware
- Rate limiting (per-user and per-IP)
- Request/response logging
- CORS configuration

---

## API Limits

### Request Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| **Request Size** | 10 MB | Max request body size |
| **Response Size** | 50 MB | Max response size |
| **Timeout** | 30 seconds | Request timeout |
| **Batch Size** | 1000 items | Max items in batch operations |
| **Page Size** | 100 items | Max items per page |

### Resource Limits

| Resource | Free | Pro | Enterprise |
|----------|------|-----|-----------|
| **Users** | 10 | 100 | Unlimited |
| **Policies** | 5 | 50 | Unlimited |
| **API Keys** | 2 | 10 | Unlimited |
| **Webhooks** | 1 | 5 | Unlimited |
| **Retention** | 30 days | 1 year | 2+ years |

---

## Support

### Documentation

- [API Reference](./API_REFERENCE.md) - Detailed endpoint documentation
- [Authentication Guide](./AUTHENTICATION_GUIDE.md) - Auth flows and security
- [Integration Guide](./INTEGRATION_GUIDE.md) - SDKs and examples
- [Webhooks](./WEBHOOKS.md) - Event notifications
- [Changelog](./API_CHANGELOG.md) - Version history

### Getting Help

- **Email:** api-support@llm-governance.example.com
- **Slack:** [LLM Governance Community](https://slack.llm-governance.example.com)
- **GitHub:** [Issues](https://github.com/llm-governance/dashboard/issues)
- **Status Page:** [status.llm-governance.example.com](https://status.llm-governance.example.com)

### API Status

Monitor API status and uptime:
- **Status Page:** https://status.llm-governance.example.com
- **Incidents:** Real-time incident notifications
- **Maintenance:** Scheduled maintenance windows

---

## Quick Start

### 1. Register an Account

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

### 2. Login

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### 3. Make Authenticated Request

```bash
curl -X GET https://api.llm-governance.example.com/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

---

## Changelog

See [API_CHANGELOG.md](./API_CHANGELOG.md) for version history and breaking changes.

**Current Version:** 1.0.0
**Last Updated:** November 16, 2025

---

## License

Copyright © 2025 LLM Governance Dashboard. All rights reserved.

This documentation is provided under the MIT License.
