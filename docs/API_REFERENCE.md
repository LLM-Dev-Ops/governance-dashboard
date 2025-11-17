# API Reference

Complete reference documentation for all API endpoints in the LLM Governance Dashboard.

**Base URL:** `https://api.llm-governance.example.com/api/v1`
**Version:** 1.0.0

---

## Table of Contents

- [Auth Service](#auth-service)
- [User Service](#user-service)
- [Policy Service](#policy-service)
- [Audit Service](#audit-service)
- [Metrics Service](#metrics-service)
- [Cost Service](#cost-service)
- [Integration Service](#integration-service)
- [API Gateway](#api-gateway)

---

## Auth Service

Authentication, JWT tokens, MFA, and OAuth2.

### POST /auth/register

Register a new user account.

**Authentication:** None (Public endpoint)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Minimum 8 characters |
| `name` | string | Yes | User's full name (2-100 chars) |

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "pending",
    "message": "User registered successfully. Please verify your email."
  },
  "timestamp": "2025-11-16T12:00:00Z"
}
```

**Error Responses:**
- `400` - Validation error (invalid email, weak password)
- `409` - User already exists
- `500` - Internal server error

**cURL Example:**
```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

---

### POST /auth/login

Authenticate user and receive JWT tokens.

**Authentication:** None (Public endpoint)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response: 200 OK (without MFA)**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "status": "active",
      "mfa_enabled": false
    },
    "requires_mfa": false
  },
  "timestamp": "2025-11-16T12:00:00Z"
}
```

**Response: 200 OK (with MFA)**
```json
{
  "success": true,
  "data": {
    "requires_mfa": true,
    "session_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "message": "MFA verification required"
  },
  "timestamp": "2025-11-16T12:00:00Z"
}
```

**cURL Example:**
```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

---

### POST /auth/mfa/verify

Verify MFA code and complete login.

**Authentication:** None (requires session_id from login)

**Request Body:**
```json
{
  "code": "123456",
  "session_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": { /* user object */ }
  }
}
```

---

### POST /auth/mfa/setup

Initialize MFA setup and get QR code.

**Authentication:** Required (Bearer token)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "backup_codes": [
      "ABCD-1234-EFGH-5678",
      "IJKL-9012-MNOP-3456",
      "QRST-4567-UVWX-8901",
      "YZAB-2345-CDEF-6789",
      "GHIJ-0123-KLMN-4567"
    ]
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/mfa/setup \
  -H "Authorization: Bearer <access_token>"
```

---

### POST /auth/mfa/enable

Enable MFA after verifying setup code.

**Authentication:** Required

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response: 200 OK**

---

### POST /auth/mfa/disable

Disable MFA for user account.

**Authentication:** Required

**Request Body:**
```json
{
  "password": "SecurePass123!"
}
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Authentication:** None (requires refresh_token)

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

---

### POST /auth/logout

Invalidate current session and tokens.

**Authentication:** Required

**Response: 200 OK**

---

### POST /auth/password-reset/initiate

Send password reset email.

**Authentication:** None

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response: 200 OK**

---

### POST /auth/password-reset/confirm

Reset password using token from email.

**Authentication:** None

**Request Body:**
```json
{
  "token": "abc123def456",
  "new_password": "NewSecurePass123!"
}
```

---

### POST /auth/password/change

Change password for authenticated user.

**Authentication:** Required

**Request Body:**
```json
{
  "current_password": "SecurePass123!",
  "new_password": "NewSecurePass123!"
}
```

---

### GET /auth/verify-email/{token}

Verify user email using token.

**Authentication:** None

**Parameters:**
- `token` (path) - Email verification token

**Response: 200 OK**

---

### GET /auth/oauth/google

Initiate Google OAuth2 flow.

**Response: 302** Redirect to Google OAuth

---

### GET /auth/oauth/google/callback

Handle Google OAuth2 callback.

**Query Parameters:**
- `code` - Authorization code
- `state` - CSRF protection token

---

### GET /auth/oauth/github

Initiate GitHub OAuth2 flow.

---

### GET /auth/oauth/github/callback

Handle GitHub OAuth2 callback.

---

## User Service

User management, RBAC, permissions, and teams.

### GET /users

List all users with pagination.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Items per page (max 100) |
| `offset` | integer | 0 | Items to skip |
| `status` | string | - | Filter by status (active, inactive, suspended) |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "name": "John Doe",
        "status": "active",
        "mfa_enabled": false,
        "created_at": "2025-11-01T10:00:00Z",
        "updated_at": "2025-11-16T12:00:00Z"
      }
    ],
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.llm-governance.example.com/api/v1/users?limit=20&offset=0" \
  -H "Authorization: Bearer <access_token>"
```

---

### POST /users

Create a new user (admin only).

**Authentication:** Required (admin permission)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "role_ids": ["550e8400-e29b-41d4-a716-446655440001"]
}
```

**Response: 201 Created**

---

### GET /users/{id}

Get user details with roles and permissions.

**Authentication:** Required

**Parameters:**
- `id` (path) - User UUID

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "active",
    "mfa_enabled": false,
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-16T12:00:00Z",
    "roles": [
      {
        "id": "role-uuid-1",
        "name": "Developer",
        "description": "Development team member"
      }
    ],
    "permissions": [
      {
        "resource": "policies",
        "action": "read"
      },
      {
        "resource": "metrics",
        "action": "read"
      }
    ]
  }
}
```

---

### PUT /users/{id}

Update user information.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "John Updated",
  "status": "active",
  "role_ids": ["role-uuid-1", "role-uuid-2"]
}
```

---

### DELETE /users/{id}

Soft delete user.

**Authentication:** Required (admin permission)

**Response: 200 OK**

---

### GET /users/{id}/permissions

Get aggregated permissions from all user roles.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "resource": "users",
        "action": "read",
        "description": "View users"
      },
      {
        "resource": "policies",
        "action": "read",
        "description": "View policies"
      }
    ]
  }
}
```

---

### POST /users/{id}/roles/{role_id}

Assign role to user.

**Authentication:** Required (admin permission)

**Response: 200 OK**

---

### DELETE /users/{id}/roles/{role_id}

Remove role from user.

**Authentication:** Required (admin permission)

**Response: 200 OK**

---

## Policy Service

Policy management, evaluation, and violation tracking.

### GET /policies

List all policies with filtering.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `policy_type` | string | Filter by type (cost, security, compliance, usage, rate_limit, content_filter) |
| `status` | string | Filter by status (active, inactive) |
| `limit` | integer | Items per page |
| `offset` | integer | Items to skip |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "policies": [
      {
        "id": "policy-uuid-1",
        "name": "Daily Cost Limit",
        "description": "Maximum daily spending limit per user",
        "policy_type": "cost",
        "rules": {
          "max_cost_per_day": 100.00
        },
        "enforcement_level": "strict",
        "status": "active",
        "version": 1,
        "created_at": "2025-11-01T10:00:00Z",
        "updated_at": "2025-11-16T12:00:00Z"
      }
    ],
    "total": 25,
    "limit": 20,
    "offset": 0
  }
}
```

---

### POST /policies

Create a new policy.

**Authentication:** Required (admin permission)

**Request Body:**
```json
{
  "name": "Daily Cost Limit",
  "description": "Maximum daily spending limit per user",
  "policy_type": "cost",
  "rules": {
    "max_cost_per_day": 100.00
  },
  "enforcement_level": "strict"
}
```

**Policy Types:**
- `cost` - Cost-based policies
- `security` - Security policies
- `compliance` - Compliance policies
- `usage` - Token usage policies
- `rate_limit` - Rate limiting policies
- `content_filter` - Content filtering policies

**Enforcement Levels:**
- `strict` - Block requests that violate policy
- `warning` - Allow but log warnings
- `monitor` - Monitor only, no enforcement

**Response: 201 Created**

---

### GET /policies/{id}

Get policy details.

**Authentication:** Required

**Response: 200 OK**

---

### PUT /policies/{id}

Update policy (increments version).

**Authentication:** Required (admin permission)

**Request Body:**
```json
{
  "name": "Updated Policy Name",
  "rules": {
    "max_cost_per_day": 150.00
  },
  "enforcement_level": "warning",
  "status": "active"
}
```

---

### DELETE /policies/{id}

Soft delete policy.

**Authentication:** Required (admin permission)

---

### POST /policies/{id}/evaluate

Evaluate policy against context.

**Authentication:** Required

**Request Body:**
```json
{
  "context": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "cost": 0.05,
    "tokens": 1500,
    "provider": "openai",
    "model": "gpt-4"
  }
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "passed": true,
    "violations": [],
    "warnings": ["Approaching daily limit (80% used)"]
  }
}
```

**Response: 422 Unprocessable (Policy Violation)**
```json
{
  "success": false,
  "error": {
    "code": "POLICY_VIOLATION",
    "message": "Policy violation detected",
    "details": {
      "passed": false,
      "violations": [
        {
          "policy_id": "policy-uuid-1",
          "policy_name": "Daily Cost Limit",
          "rule_violated": "max_cost_per_day",
          "severity": "high",
          "message": "Daily cost limit of $100 exceeded"
        }
      ]
    }
  }
}
```

---

### POST /policies/{id}/assign

Assign policy to team or user.

**Authentication:** Required (admin permission)

**Request Body:**
```json
{
  "team_id": "team-uuid-1"
}
```
OR
```json
{
  "user_id": "user-uuid-1"
}
```

---

### GET /policies/{id}/violations

Get policy violations.

**Authentication:** Required

**Response: 200 OK**

---

## Audit Service

Immutable audit logging and compliance reporting.

### POST /audit/logs

Create audit log entry.

**Authentication:** Required

**Request Body:**
```json
{
  "action": "login",
  "resource_type": "user",
  "resource_id": "550e8400-e29b-41d4-a716-446655440000",
  "details": {
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Response: 201 Created**

---

### GET /audit/logs

Query audit logs with filters.

**Authentication:** Required (admin permission)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | UUID | Filter by user |
| `action` | string | Filter by action (login, logout, create, update, delete) |
| `resource_type` | string | Filter by resource type |
| `start_date` | ISO 8601 | Start date |
| `end_date` | ISO 8601 | End date |
| `limit` | integer | Items per page |
| `offset` | integer | Items to skip |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-uuid-1",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "action": "login",
        "resource_type": "user",
        "resource_id": "550e8400-e29b-41d4-a716-446655440000",
        "details": {
          "ip": "192.168.1.1"
        },
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "checksum": "a3f5b8c9d2e1...",
        "created_at": "2025-11-16T12:00:00Z"
      }
    ],
    "total": 1500
  }
}
```

---

### GET /audit/logs/{id}

Get specific audit log.

**Authentication:** Required (admin permission)

---

### GET /audit/logs/{id}/verify

Verify log integrity using SHA-256 checksum.

**Authentication:** Required (admin permission)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "checksum": "a3f5b8c9d2e1..."
  }
}
```

---

### POST /audit/export

Export audit logs in CSV or JSON format.

**Authentication:** Required (admin permission)

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "start_date": "2025-11-01T00:00:00Z",
    "end_date": "2025-11-16T23:59:59Z",
    "action": "login"
  }
}
```

**Response: 200 OK**
Content-Type: application/csv or application/json

---

### GET /audit/reports/compliance

Generate compliance report.

**Authentication:** Required (admin permission)

**Query Parameters:**
- `start_date` (required) - Report start date
- `end_date` (required) - Report end date

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-11-01T00:00:00Z",
      "end": "2025-11-16T23:59:59Z"
    },
    "total_actions": 15000,
    "unique_users": 150,
    "actions_by_type": {
      "login": 2500,
      "logout": 2400,
      "create": 800,
      "update": 600,
      "delete": 100
    }
  }
}
```

---

## Metrics Service

Time-series metrics collection and analytics.

### POST /metrics/ingest

Ingest single metric.

**Authentication:** Required

**Request Body:**
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "tokens_input": 150,
  "tokens_output": 75,
  "latency_ms": 1250,
  "cost": 0.0123,
  "status": "success",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "team_id": "team-uuid-1"
}
```

**Response: 201 Created**

---

### POST /metrics/ingest/batch

Ingest multiple metrics (up to 1000).

**Authentication:** Required

**Request Body:**
```json
{
  "metrics": [
    {
      "provider": "openai",
      "model": "gpt-4",
      "tokens_input": 150,
      "tokens_output": 75,
      "latency_ms": 1250,
      "cost": 0.0123
    },
    {
      "provider": "anthropic",
      "model": "claude-3-sonnet-20240229",
      "tokens_input": 200,
      "tokens_output": 100,
      "latency_ms": 950,
      "cost": 0.0045
    }
  ]
}
```

**Response: 201 Created**

---

### GET /metrics/query

Query raw metrics with filters.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | string | Filter by provider |
| `model` | string | Filter by model |
| `user_id` | UUID | Filter by user |
| `team_id` | UUID | Filter by team |
| `start_time` | ISO 8601 | Start timestamp |
| `end_time` | ISO 8601 | End timestamp |
| `limit` | integer | Items per page (default: 100) |

**Response: 200 OK**

---

### GET /metrics/aggregate/hourly

Get hourly aggregated metrics.

**Authentication:** Required

**Query Parameters:**
- `start_time` (required)
- `end_time` (required)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "aggregates": [
      {
        "hour": "2025-11-16T12:00:00Z",
        "total_requests": 450,
        "total_tokens": 125000,
        "avg_latency_ms": 1100,
        "total_cost": 12.50
      }
    ]
  }
}
```

---

### GET /metrics/aggregate/daily

Get daily aggregated metrics.

**Authentication:** Required

**Query Parameters:**
- `start_date` (required)
- `end_date` (required)

---

### GET /metrics/stats/usage

Get usage statistics.

**Authentication:** Required

**Query Parameters:**
- `period` - day, week, or month (default: day)

---

### GET /metrics/stats/by-provider

Get statistics grouped by provider.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "provider": "openai",
        "total_requests": 5000,
        "total_tokens": 2500000,
        "total_cost": 125.50,
        "avg_latency_ms": 1150
      },
      {
        "provider": "anthropic",
        "total_requests": 3000,
        "total_tokens": 1800000,
        "total_cost": 67.30,
        "avg_latency_ms": 980
      }
    ]
  }
}
```

---

### GET /metrics/stats/by-model

Get statistics grouped by model.

**Authentication:** Required

---

## Cost Service

Cost tracking, budgets, and forecasting.

### POST /costs/calculate

Calculate cost for request.

**Authentication:** Required

**Request Body:**
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "tokens_input": 1000,
  "tokens_output": 500
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "cost": 0.045,
    "breakdown": {
      "input_cost": 0.030,
      "output_cost": 0.015
    }
  }
}
```

**Pricing (per 1M tokens):**
- OpenAI GPT-4: $30 input, $60 output
- OpenAI GPT-4 Turbo: $10 input, $30 output
- OpenAI GPT-3.5 Turbo: $0.50 input, $1.50 output
- Anthropic Claude 3 Opus: $15 input, $75 output
- Anthropic Claude 3 Sonnet: $3 input, $15 output
- Anthropic Claude 3 Haiku: $0.25 input, $1.25 output

---

### GET /costs/team/{team_id}

Get team costs.

**Authentication:** Required

**Query Parameters:**
- `start_date` - Start date (optional)
- `end_date` - End date (optional)

**Response: 200 OK**

---

### GET /costs/user/{user_id}

Get user costs.

**Authentication:** Required

---

### POST /costs/budgets

Create budget.

**Authentication:** Required (admin permission)

**Request Body:**
```json
{
  "amount": 1000.00,
  "period": "monthly",
  "scope": "team",
  "team_id": "team-uuid-1"
}
```

**Parameters:**
- `amount` - Budget amount in USD
- `period` - daily, weekly, or monthly
- `scope` - team, user, or global
- `team_id` - Required if scope is team
- `user_id` - Required if scope is user

**Response: 201 Created**

---

### GET /costs/budgets

List all budgets.

**Authentication:** Required

---

### GET /costs/budgets/{id}

Get budget details with utilization.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "budget-uuid-1",
    "amount": 1000.00,
    "spent": 675.50,
    "remaining": 324.50,
    "utilization_percentage": 67.55,
    "period": "monthly",
    "scope": "team",
    "team_id": "team-uuid-1",
    "status": "active"
  }
}
```

---

### PUT /costs/budgets/{id}

Update budget.

**Authentication:** Required (admin permission)

---

### DELETE /costs/budgets/{id}

Delete budget.

**Authentication:** Required (admin permission)

---

### GET /costs/forecast

Forecast future costs based on historical data.

**Authentication:** Required

**Query Parameters:**
- `team_id` - Team UUID (optional)
- `user_id` - User UUID (optional)
- `days` - Forecast period in days (default: 30)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "forecast": {
      "period_days": 30,
      "estimated_cost": 3450.00,
      "daily_average": 115.00,
      "confidence_level": "medium",
      "based_on_days": 30
    }
  }
}
```

---

### GET /costs/reports/chargeback

Generate chargeback/showback report.

**Authentication:** Required (admin permission)

**Query Parameters:**
- `start_date` (required)
- `end_date` (required)

**Response: 200 OK**

---

## Integration Service

LLM provider proxy with circuit breaker.

### POST /integrations/proxy

Proxy request to LLM provider.

**Authentication:** Required

**Request Body (OpenAI):**
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant"
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 150
}
```

**Request Body (Anthropic):**
```json
{
  "provider": "anthropic",
  "model": "claude-3-sonnet-20240229",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude!"
    }
  ],
  "max_tokens": 1024
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "provider": "openai",
    "model": "gpt-4",
    "content": "Hello! I'm doing well, thank you for asking. How can I assist you today?",
    "usage": {
      "prompt_tokens": 25,
      "completion_tokens": 18,
      "total_tokens": 43
    },
    "cost": 0.00129,
    "latency_ms": 1250
  }
}
```

**Error Response: 422 Unprocessable (Policy Violation)**
```json
{
  "success": false,
  "error": {
    "code": "POLICY_VIOLATION",
    "message": "Request violates policy: Daily Cost Limit",
    "details": {
      "policy": "Daily Cost Limit",
      "violation": "Daily cost limit exceeded"
    }
  }
}
```

**Error Response: 503 Service Unavailable**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Provider temporarily unavailable",
    "details": {
      "provider": "openai",
      "circuit_state": "open"
    }
  }
}
```

---

### GET /integrations/providers

List available providers and their status.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "openai",
        "status": "available",
        "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
      },
      {
        "name": "anthropic",
        "status": "available",
        "models": [
          "claude-3-opus-20240229",
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307"
        ]
      },
      {
        "name": "google",
        "status": "available",
        "models": ["gemini-pro", "gemini-pro-vision"]
      }
    ]
  }
}
```

---

### GET /integrations/health

Check provider health status.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "openai": {
      "status": "healthy",
      "circuit_state": "closed",
      "failure_count": 0
    },
    "anthropic": {
      "status": "healthy",
      "circuit_state": "closed",
      "failure_count": 0
    }
  }
}
```

---

## API Gateway

Central gateway with routing and rate limiting.

### GET /health

Gateway health check.

**Authentication:** None

**Response: 200 OK**
```json
{
  "status": "healthy",
  "services": {
    "auth-service": {
      "status": "healthy",
      "latency_ms": 5
    },
    "user-service": {
      "status": "healthy",
      "latency_ms": 3
    }
  }
}
```

---

### GET /health/ready

Kubernetes readiness probe.

**Authentication:** None

---

### GET /health/live

Kubernetes liveness probe.

**Authentication:** None

---

## Common Error Handling

All endpoints follow standard error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  },
  "timestamp": "2025-11-16T12:00:00Z"
}
```

### Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_FAILED` | 401 | Invalid credentials |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `TOKEN_INVALID` | 401 | Invalid JWT token |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_EXISTS` | 409 | Resource conflict |
| `POLICY_VIOLATION` | 422 | Policy violation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `DATABASE_ERROR` | 500 | Database error |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service unavailable |

---

## Rate Limiting

All endpoints are rate-limited. Check headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1700140800
```

When exceeded:

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

---

## Additional Resources

- [API Documentation](./API_DOCUMENTATION.md) - Overview and getting started
- [Authentication Guide](./AUTHENTICATION_GUIDE.md) - Detailed auth flows
- [Integration Guide](./INTEGRATION_GUIDE.md) - SDKs and examples
- [Webhooks](./WEBHOOKS.md) - Event notifications
- [Changelog](./API_CHANGELOG.md) - Version history
- [OpenAPI Specs](./openapi/) - Machine-readable specifications

---

**Last Updated:** November 16, 2025
**Version:** 1.0.0
