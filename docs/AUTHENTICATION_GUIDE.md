# Authentication Guide

Complete guide to authentication, authorization, and security in the LLM Governance Dashboard API.

---

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [JWT Authentication](#jwt-authentication)
- [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
- [OAuth2 Integration](#oauth2-integration)
- [API Keys](#api-keys)
- [Password Management](#password-management)
- [Session Management](#session-management)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Security Best Practices](#security-best-practices)

---

## Overview

The LLM Governance Dashboard uses multiple authentication methods to ensure secure access to the API:

1. **JWT (JSON Web Tokens)** - Primary authentication method
2. **Multi-Factor Authentication (MFA)** - Optional second factor using TOTP
3. **OAuth2** - Social authentication (Google, GitHub)
4. **API Keys** - Service-to-service authentication

All API communications must use HTTPS. HTTP requests will be rejected.

---

## Authentication Methods

### Comparison Matrix

| Method | Use Case | Security Level | Expiration |
|--------|----------|----------------|------------|
| **JWT** | User authentication | High | 1 hour |
| **JWT + MFA** | Admin accounts | Very High | 1 hour |
| **OAuth2** | Social login | High | 1 hour |
| **API Keys** | Service accounts | Medium | No expiration |
| **Refresh Token** | Token renewal | High | 7 days |

---

## JWT Authentication

### How It Works

1. User provides credentials (email + password)
2. Server validates credentials
3. Server generates access token (JWT) and refresh token
4. Client includes access token in subsequent requests
5. When access token expires, use refresh token to get new access token

### Flow Diagram

```
┌─────────┐                                    ┌─────────┐
│ Client  │                                    │  Server │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  POST /auth/login                            │
     │  { email, password }                         │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                Validate credentials          │
     │                Generate JWT tokens           │
     │                                              │
     │  200 OK                                      │
     │  { access_token, refresh_token, ... }        │
     │<─────────────────────────────────────────────┤
     │                                              │
     │  GET /users (with Bearer token)              │
     │  Authorization: Bearer <access_token>        │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                Verify JWT                    │
     │                Extract user info             │
     │                                              │
     │  200 OK { users: [...] }                     │
     │<─────────────────────────────────────────────┤
     │                                              │
```

### Registration Flow

**Step 1: Register Account**

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "pending",
    "message": "User registered successfully. Please verify your email."
  }
}
```

**Step 2: Verify Email**

Check email for verification link:
```
https://app.llm-governance.example.com/verify-email?token=abc123def456
```

Or call API directly:
```bash
curl -X GET https://api.llm-governance.example.com/api/v1/auth/verify-email/abc123def456
```

### Login Flow

**Basic Login (without MFA):**

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
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiZXhwIjoxNzAwMTQ0NDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjE3MDA3NDkyMDB9.9vZ3KqJ7xJf8yJK5pMeKKF2QT4fwpMeJf36POk6yJV",
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
  }
}
```

### Using Access Tokens

Include the access token in the Authorization header:

```bash
curl -X GET https://api.llm-governance.example.com/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript Example:**
```javascript
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

fetch('https://api.llm-governance.example.com/api/v1/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data));
```

**Python Example:**
```python
import requests

access_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.llm-governance.example.com/api/v1/users',
    headers=headers
)

data = response.json()
print(data)
```

### Token Refresh Flow

When access token expires (after 1 hour), use refresh token to get new tokens:

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "new_access_token_here...",
    "refresh_token": "new_refresh_token_here...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**Automatic Token Refresh (JavaScript):**
```javascript
class APIClient {
  constructor(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // If token expired, refresh and retry
      if (response.status === 401) {
        await this.refresh();
        return this.request(url, options);
      }

      return response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async refresh() {
    const response = await fetch(
      'https://api.llm-governance.example.com/api/v1/auth/refresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      }
    );

    const data = await response.json();
    this.accessToken = data.data.access_token;
    this.refreshToken = data.data.refresh_token;
  }
}
```

### JWT Token Structure

**Decoded Access Token:**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["developer"],
    "iat": 1700140800,
    "exp": 1700144400
  },
  "signature": "..."
}
```

**Token Claims:**
- `user_id` - User UUID
- `email` - User email
- `name` - User name
- `roles` - User roles array
- `iat` - Issued at (timestamp)
- `exp` - Expiration time (timestamp)

---

## Multi-Factor Authentication (MFA)

### Overview

MFA adds an extra layer of security using Time-based One-Time Passwords (TOTP). Compatible with:
- Google Authenticator
- Authy
- Microsoft Authenticator
- 1Password
- Any TOTP-compatible app

### Setup Flow

**Step 1: Initialize MFA Setup**

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/mfa/setup \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
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

**Step 2: Scan QR Code**

Display the QR code to the user and have them scan it with their authenticator app.

**Step 3: Enable MFA**

Verify setup by providing a code from the authenticator app:

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/mfa/enable \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

### Login with MFA

**Step 1: Initial Login**

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response (MFA Required):**
```json
{
  "success": true,
  "data": {
    "requires_mfa": true,
    "session_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "message": "MFA verification required"
  }
}
```

**Step 2: Verify MFA Code**

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "session_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": { /* user info */ }
  }
}
```

### Disable MFA

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/mfa/disable \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePass123!"
  }'
```

### Backup Codes

Backup codes are one-time use codes that can be used if the authenticator app is unavailable.

- **Store securely** - Save backup codes in a secure location
- **One-time use** - Each code can only be used once
- **Generate new** - Generate new backup codes after using them

---

## OAuth2 Integration

### Supported Providers

- Google
- GitHub

### Google OAuth Flow

**Step 1: Initiate OAuth**

Redirect user to:
```
GET https://api.llm-governance.example.com/api/v1/auth/oauth/google
```

This redirects to Google's OAuth consent screen.

**Step 2: User Authorizes**

User grants permission on Google's consent screen.

**Step 3: Callback**

Google redirects back to:
```
GET https://api.llm-governance.example.com/api/v1/auth/oauth/google/callback?code=xxx&state=yyy
```

**Step 4: Receive Tokens**

The callback returns JWT tokens:
```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@gmail.com",
      "name": "John Doe",
      "oauth_provider": "google"
    }
  }
}
```

### GitHub OAuth Flow

Similar to Google, but using GitHub endpoints:

```
GET /auth/oauth/github
GET /auth/oauth/github/callback
```

### Implementation Example (JavaScript)

```javascript
// Initiate OAuth
function loginWithGoogle() {
  window.location.href = 'https://api.llm-governance.example.com/api/v1/auth/oauth/google';
}

// Handle callback (in your app)
function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  // The API will handle the exchange and redirect with tokens
  // You can configure a redirect URL in your OAuth settings
}
```

---

## API Keys

### Overview

API keys are for service-to-service authentication and machine-to-machine communication.

### Generating API Keys

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/users/me/api-keys \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Service",
    "scopes": ["metrics:read", "metrics:write"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key-uuid-1",
    "name": "Production Service",
    "api_key": "llm_gov_sk_1234567890abcdefghijklmnopqrstuvwxyz",
    "scopes": ["metrics:read", "metrics:write"],
    "created_at": "2025-11-16T12:00:00Z"
  }
}
```

**Important:** Save the API key securely. It will only be shown once.

### Using API Keys

Include the API key in the `X-API-Key` header:

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/metrics/ingest \
  -H "X-API-Key: llm_gov_sk_1234567890abcdefghijklmnopqrstuvwxyz" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4",
    "tokens_input": 150,
    "tokens_output": 75
  }'
```

### Managing API Keys

**List API Keys:**
```bash
GET /users/me/api-keys
```

**Revoke API Key:**
```bash
DELETE /users/me/api-keys/{id}
```

---

## Password Management

### Password Requirements

- Minimum 8 characters
- Maximum 128 characters
- No special requirements (but recommended: uppercase, lowercase, numbers, special chars)

### Change Password

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/password/change \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "SecurePass123!",
    "new_password": "NewSecurePass456!"
  }'
```

### Password Reset Flow

**Step 1: Initiate Reset**

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/password-reset/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent. Please check your inbox."
  }
}
```

**Step 2: Check Email**

User receives email with reset link:
```
https://app.llm-governance.example.com/reset-password?token=abc123def456
```

**Step 3: Confirm Reset**

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123def456",
    "new_password": "NewSecurePass789!"
  }'
```

### Password Security

- Passwords are hashed using **Argon2** (winner of Password Hashing Competition)
- Never stored in plain text
- Never transmitted in logs
- Reset tokens expire after 1 hour

---

## Session Management

### Session Lifetime

| Token Type | Lifetime | Renewable |
|------------|----------|-----------|
| Access Token | 1 hour | No (use refresh) |
| Refresh Token | 7 days | Yes |
| MFA Session | 5 minutes | No |
| Password Reset Token | 1 hour | No |

### Logout

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

This invalidates the current session and tokens.

### Logout All Sessions

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/auth/logout-all \
  -H "Authorization: Bearer <access_token>"
```

This invalidates all sessions for the user across all devices.

---

## Role-Based Access Control (RBAC)

### Overview

The platform uses hierarchical role-based access control with permission inheritance.

### Built-in Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Super Admin** | Full system access | All permissions |
| **Admin** | Organization admin | All except system config |
| **Manager** | Team manager | Team management, policies |
| **Developer** | Developer access | Read most, write limited |
| **Viewer** | Read-only access | Read-only |

### Permission Model

Permissions follow the format: `resource:action`

**Resources:**
- `users` - User management
- `policies` - Policy management
- `metrics` - Metrics access
- `costs` - Cost data
- `audit` - Audit logs
- `integrations` - LLM integrations

**Actions:**
- `create` - Create new resources
- `read` - View resources
- `update` - Modify resources
- `delete` - Delete resources

**Examples:**
- `users:read` - View users
- `policies:create` - Create policies
- `metrics:read` - View metrics
- `audit:read` - View audit logs

### Checking Permissions

The API automatically checks permissions based on the user's roles:

```bash
# This requires "users:read" permission
GET /users

# This requires "policies:create" permission
POST /policies
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "details": {
      "required_permission": "policies:create",
      "user_permissions": ["policies:read", "metrics:read"]
    }
  }
}
```

### Role Hierarchy

Roles can inherit from parent roles:

```
Super Admin (all permissions)
    └── Admin
        └── Manager
            └── Developer
                └── Viewer
```

### Custom Roles

Create custom roles with specific permissions:

```bash
curl -X POST https://api.llm-governance.example.com/api/v1/roles \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Analytics Team",
    "description": "Analytics team with metrics access",
    "permissions": [
      "metrics:read",
      "metrics:write",
      "costs:read"
    ]
  }'
```

---

## Security Best Practices

### 1. Token Storage

**Client-Side (Browser):**
- ✅ Store in memory (most secure, lost on refresh)
- ✅ Store in httpOnly cookies (secure, persists)
- ❌ LocalStorage (vulnerable to XSS)
- ❌ SessionStorage (vulnerable to XSS)

**Server-Side:**
- ✅ Environment variables
- ✅ Secret management services (AWS Secrets Manager, HashiCorp Vault)
- ❌ Hard-coded in source code
- ❌ Committed to version control

### 2. HTTPS Only

Always use HTTPS in production. The API rejects HTTP requests.

### 3. Token Expiration

- Access tokens expire after 1 hour
- Refresh tokens expire after 7 days
- Implement token refresh logic
- Handle token expiration gracefully

### 4. MFA for Sensitive Operations

Enable MFA for:
- Admin accounts
- Production API access
- Financial operations
- User management

### 5. API Key Rotation

- Rotate API keys regularly (every 90 days)
- Use different keys for different environments
- Revoke compromised keys immediately

### 6. Rate Limiting

- Respect rate limits
- Implement exponential backoff
- Cache responses when possible

### 7. Error Handling

Don't expose sensitive information in errors:

```javascript
// ❌ Bad
catch (error) {
  console.log('Error:', error.message); // May contain sensitive data
}

// ✅ Good
catch (error) {
  if (error.response?.status === 401) {
    // Handle authentication error
    redirectToLogin();
  } else {
    // Log error securely
    logError(error);
  }
}
```

### 8. Input Validation

Always validate user input before making API calls:

```javascript
// ✅ Good
function login(email, password) {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }
  if (password.length < 8) {
    throw new Error('Password too short');
  }
  return apiClient.login(email, password);
}
```

### 9. Audit Logging

All authentication events are logged:
- Login attempts (success/failure)
- Password changes
- MFA setup/disable
- API key creation/revocation
- Permission changes

### 10. Monitoring

Monitor for suspicious activity:
- Multiple failed login attempts
- Unusual access patterns
- Token reuse from different IPs
- Privilege escalation attempts

---

## Common Issues and Solutions

### Issue: Token Expired

**Error:**
```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired"
  }
}
```

**Solution:** Use refresh token to get new access token

### Issue: Invalid Credentials

**Error:**
```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials"
  }
}
```

**Solutions:**
- Verify email and password are correct
- Check if account is active
- Verify email has been confirmed

### Issue: MFA Code Invalid

**Error:**
```json
{
  "error": {
    "code": "MFA_INVALID",
    "message": "Invalid MFA code"
  }
}
```

**Solutions:**
- Ensure device time is synchronized
- Try the next code (TOTP codes change every 30 seconds)
- Use a backup code if available

### Issue: Rate Limited

**Error:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests"
  }
}
```

**Solution:** Wait for rate limit reset (check `X-RateLimit-Reset` header)

---

## Code Examples

### Complete Authentication Flow (JavaScript)

```javascript
class AuthClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async register(email, password, name) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    return response.json();
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.data.requires_mfa) {
      return { requiresMfa: true, sessionId: data.data.session_id };
    }

    this.accessToken = data.data.access_token;
    this.refreshToken = data.data.refresh_token;
    return { requiresMfa: false, user: data.data.user };
  }

  async verifyMfa(code, sessionId) {
    const response = await fetch(`${this.baseUrl}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, session_id: sessionId })
    });

    const data = await response.json();
    this.accessToken = data.data.access_token;
    this.refreshToken = data.data.refresh_token;
    return data.data.user;
  }

  async refresh() {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken })
    });

    const data = await response.json();
    this.accessToken = data.data.access_token;
    this.refreshToken = data.data.refresh_token;
  }

  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (response.status === 401) {
        await this.refresh();
        return this.request(url, options);
      }

      return response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async logout() {
    await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    this.accessToken = null;
    this.refreshToken = null;
  }
}

// Usage
const auth = new AuthClient('https://api.llm-governance.example.com/api/v1');

// Register
await auth.register('user@example.com', 'SecurePass123!', 'John Doe');

// Login
const loginResult = await auth.login('user@example.com', 'SecurePass123!');

if (loginResult.requiresMfa) {
  const code = prompt('Enter MFA code:');
  await auth.verifyMfa(code, loginResult.sessionId);
}

// Make authenticated request
const users = await auth.request('https://api.llm-governance.example.com/api/v1/users');
```

### Complete Authentication Flow (Python)

```python
import requests
from typing import Optional, Dict

class AuthClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None

    def register(self, email: str, password: str, name: str) -> Dict:
        response = requests.post(
            f'{self.base_url}/auth/register',
            json={'email': email, 'password': password, 'name': name}
        )
        return response.json()

    def login(self, email: str, password: str) -> Dict:
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        data = response.json()

        if data['data'].get('requires_mfa'):
            return {
                'requires_mfa': True,
                'session_id': data['data']['session_id']
            }

        self.access_token = data['data']['access_token']
        self.refresh_token = data['data']['refresh_token']
        return {'requires_mfa': False, 'user': data['data']['user']}

    def verify_mfa(self, code: str, session_id: str) -> Dict:
        response = requests.post(
            f'{self.base_url}/auth/mfa/verify',
            json={'code': code, 'session_id': session_id}
        )
        data = response.json()
        self.access_token = data['data']['access_token']
        self.refresh_token = data['data']['refresh_token']
        return data['data']['user']

    def refresh(self):
        response = requests.post(
            f'{self.base_url}/auth/refresh',
            json={'refresh_token': self.refresh_token}
        )
        data = response.json()
        self.access_token = data['data']['access_token']
        self.refresh_token = data['data']['refresh_token']

    def request(self, url: str, method: str = 'GET', **kwargs) -> Dict:
        headers = kwargs.get('headers', {})
        headers['Authorization'] = f'Bearer {self.access_token}'
        kwargs['headers'] = headers

        response = requests.request(method, url, **kwargs)

        if response.status_code == 401:
            self.refresh()
            return self.request(url, method, **kwargs)

        return response.json()

    def logout(self):
        requests.post(
            f'{self.base_url}/auth/logout',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        self.access_token = None
        self.refresh_token = None

# Usage
auth = AuthClient('https://api.llm-governance.example.com/api/v1')

# Register
auth.register('user@example.com', 'SecurePass123!', 'John Doe')

# Login
login_result = auth.login('user@example.com', 'SecurePass123!')

if login_result['requires_mfa']:
    code = input('Enter MFA code: ')
    auth.verify_mfa(code, login_result['session_id'])

# Make authenticated request
users = auth.request('https://api.llm-governance.example.com/api/v1/users')
```

---

## Support

For authentication issues:
- Email: auth-support@llm-governance.example.com
- Documentation: https://docs.llm-governance.example.com
- Status: https://status.llm-governance.example.com

---

**Last Updated:** November 16, 2025
**Version:** 1.0.0
