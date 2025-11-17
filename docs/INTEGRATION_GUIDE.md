# Integration Guide

Learn how to integrate the LLM Governance Dashboard API into your applications using SDKs, code examples, and best practices.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Official SDKs](#official-sdks)
- [JavaScript/TypeScript SDK](#javascripttypescript-sdk)
- [Python SDK](#python-sdk)
- [Go SDK](#go-sdk)
- [cURL Examples](#curl-examples)
- [Common Integration Patterns](#common-integration-patterns)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Retry Logic](#retry-logic)
- [Testing](#testing)
- [Best Practices](#best-practices)

---

## Quick Start

### 1. Get API Credentials

Register and login to obtain access token:

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

### 2. Install SDK

**JavaScript/TypeScript:**
```bash
npm install @llm-governance/sdk-js
```

**Python:**
```bash
pip install llm-governance-sdk
```

**Go:**
```bash
go get github.com/llm-governance/sdk-go
```

### 3. Make Your First Request

**JavaScript:**
```javascript
import { LLMGovernance } from '@llm-governance/sdk-js';

const client = new LLMGovernance({
  accessToken: 'your-access-token'
});

const users = await client.users.list();
console.log(users);
```

**Python:**
```python
from llm_governance import Client

client = Client(access_token='your-access-token')
users = client.users.list()
print(users)
```

---

## Official SDKs

### JavaScript/TypeScript SDK

**Installation:**
```bash
npm install @llm-governance/sdk-js
```

**Initialization:**
```javascript
import { LLMGovernance } from '@llm-governance/sdk-js';

const client = new LLMGovernance({
  baseUrl: 'https://api.llm-governance.example.com/api/v1',
  accessToken: 'your-access-token',
  refreshToken: 'your-refresh-token',
  onTokenRefresh: (tokens) => {
    // Save new tokens
    localStorage.setItem('access_token', tokens.accessToken);
    localStorage.setItem('refresh_token', tokens.refreshToken);
  }
});
```

**Authentication:**
```javascript
// Register
const user = await client.auth.register({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe'
});

// Login
const session = await client.auth.login({
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// MFA
if (session.requiresMfa) {
  await client.auth.verifyMfa({
    code: '123456',
    sessionId: session.sessionId
  });
}

// Logout
await client.auth.logout();
```

**User Management:**
```javascript
// List users
const users = await client.users.list({
  limit: 20,
  offset: 0,
  status: 'active'
});

// Get user
const user = await client.users.get('user-id');

// Create user
const newUser = await client.users.create({
  email: 'newuser@example.com',
  name: 'Jane Smith',
  roleIds: ['role-id-1']
});

// Update user
await client.users.update('user-id', {
  name: 'Updated Name'
});

// Delete user
await client.users.delete('user-id');
```

**Policy Management:**
```javascript
// Create policy
const policy = await client.policies.create({
  name: 'Daily Cost Limit',
  policyType: 'cost',
  rules: { maxCostPerDay: 100.00 },
  enforcementLevel: 'strict'
});

// Evaluate policy
const result = await client.policies.evaluate('policy-id', {
  userId: 'user-id',
  cost: 0.05,
  tokens: 1500
});

if (!result.passed) {
  console.error('Policy violation:', result.violations);
}
```

**Metrics:**
```javascript
// Ingest metric
await client.metrics.ingest({
  provider: 'openai',
  model: 'gpt-4',
  tokensInput: 150,
  tokensOutput: 75,
  latencyMs: 1250,
  cost: 0.0123
});

// Batch ingest
await client.metrics.ingestBatch([
  { provider: 'openai', model: 'gpt-4', /* ... */ },
  { provider: 'anthropic', model: 'claude-3-sonnet', /* ... */ }
]);

// Query metrics
const metrics = await client.metrics.query({
  provider: 'openai',
  startTime: '2025-11-01T00:00:00Z',
  endTime: '2025-11-16T23:59:59Z'
});
```

**LLM Integration:**
```javascript
// Proxy LLM request
const response = await client.integrations.proxy({
  provider: 'openai',
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7,
  maxTokens: 150
});

console.log(response.content);
console.log('Cost:', response.cost);
console.log('Latency:', response.latencyMs, 'ms');
```

---

### Python SDK

**Installation:**
```bash
pip install llm-governance-sdk
```

**Initialization:**
```python
from llm_governance import Client

client = Client(
    base_url='https://api.llm-governance.example.com/api/v1',
    access_token='your-access-token',
    refresh_token='your-refresh-token'
)
```

**Authentication:**
```python
# Register
user = client.auth.register(
    email='user@example.com',
    password='SecurePass123!',
    name='John Doe'
)

# Login
session = client.auth.login(
    email='user@example.com',
    password='SecurePass123!'
)

if session.requires_mfa:
    client.auth.verify_mfa(
        code='123456',
        session_id=session.session_id
    )
```

**User Management:**
```python
# List users
users = client.users.list(limit=20, offset=0, status='active')

# Get user
user = client.users.get('user-id')

# Create user
new_user = client.users.create(
    email='newuser@example.com',
    name='Jane Smith',
    role_ids=['role-id-1']
)
```

**Policy Management:**
```python
# Create policy
policy = client.policies.create(
    name='Daily Cost Limit',
    policy_type='cost',
    rules={'max_cost_per_day': 100.00},
    enforcement_level='strict'
)

# Evaluate policy
result = client.policies.evaluate('policy-id', {
    'user_id': 'user-id',
    'cost': 0.05,
    'tokens': 1500
})

if not result.passed:
    print('Policy violation:', result.violations)
```

**Metrics:**
```python
# Ingest metric
client.metrics.ingest(
    provider='openai',
    model='gpt-4',
    tokens_input=150,
    tokens_output=75,
    latency_ms=1250,
    cost=0.0123
)

# Batch ingest
client.metrics.ingest_batch([
    {'provider': 'openai', 'model': 'gpt-4', ...},
    {'provider': 'anthropic', 'model': 'claude-3-sonnet', ...}
])
```

**LLM Integration:**
```python
# Proxy LLM request
response = client.integrations.proxy(
    provider='openai',
    model='gpt-4',
    messages=[
        {'role': 'system', 'content': 'You are a helpful assistant'},
        {'role': 'user', 'content': 'Hello!'}
    ],
    temperature=0.7,
    max_tokens=150
)

print(response.content)
print(f'Cost: ${response.cost}')
print(f'Latency: {response.latency_ms}ms')
```

---

### Go SDK

**Installation:**
```bash
go get github.com/llm-governance/sdk-go
```

**Usage:**
```go
package main

import (
    "context"
    "fmt"
    llmgov "github.com/llm-governance/sdk-go"
)

func main() {
    client := llmgov.NewClient(&llmgov.Config{
        BaseURL:      "https://api.llm-governance.example.com/api/v1",
        AccessToken:  "your-access-token",
        RefreshToken: "your-refresh-token",
    })

    // List users
    users, err := client.Users.List(context.Background(), &llmgov.ListUsersOptions{
        Limit:  20,
        Offset: 0,
    })
    if err != nil {
        panic(err)
    }

    for _, user := range users.Users {
        fmt.Printf("User: %s (%s)\n", user.Name, user.Email)
    }

    // Proxy LLM request
    response, err := client.Integrations.Proxy(context.Background(), &llmgov.ProxyRequest{
        Provider: "openai",
        Model:    "gpt-4",
        Messages: []llmgov.Message{
            {Role: "system", Content: "You are a helpful assistant"},
            {Role: "user", Content: "Hello!"},
        },
        Temperature: 0.7,
        MaxTokens:   150,
    })
    if err != nil {
        panic(err)
    }

    fmt.Printf("Response: %s\n", response.Content)
    fmt.Printf("Cost: $%.4f\n", response.Cost)
}
```

---

## cURL Examples

### Complete Workflow

```bash
# 1. Register
curl -X POST https://api.llm-governance.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'

# 2. Login
ACCESS_TOKEN=$(curl -X POST https://api.llm-governance.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }' | jq -r '.data.access_token')

# 3. Create policy
curl -X POST https://api.llm-governance.example.com/api/v1/policies \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Cost Limit",
    "policy_type": "cost",
    "rules": {"max_cost_per_day": 100.00},
    "enforcement_level": "strict"
  }'

# 4. Proxy LLM request
curl -X POST https://api.llm-governance.example.com/api/v1/integrations/proxy \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.7,
    "max_tokens": 150
  }'

# 5. Query metrics
curl -X GET "https://api.llm-governance.example.com/api/v1/metrics/stats/usage?period=day" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Common Integration Patterns

### Pattern 1: LLM Request with Policy Enforcement

```javascript
async function makeLLMRequest(prompt) {
  try {
    const response = await client.integrations.proxy({
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    });

    // Metrics are automatically recorded
    console.log('Cost:', response.cost);
    console.log('Tokens:', response.usage.totalTokens);

    return response.content;
  } catch (error) {
    if (error.code === 'POLICY_VIOLATION') {
      console.error('Policy violation:', error.details);
      // Handle policy violation (e.g., notify user, use fallback)
    } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Implement retry logic
      await sleep(error.details.resetIn * 1000);
      return makeLLMRequest(prompt);
    }
    throw error;
  }
}
```

### Pattern 2: Bulk Metrics Ingestion

```python
import time
from llm_governance import Client

client = Client(access_token='...')

metrics_buffer = []

def track_llm_call(provider, model, tokens_in, tokens_out, latency, cost):
    metrics_buffer.append({
        'provider': provider,
        'model': model,
        'tokens_input': tokens_in,
        'tokens_output': tokens_out,
        'latency_ms': latency,
        'cost': cost,
        'timestamp': time.time()
    })

    # Flush buffer every 100 metrics
    if len(metrics_buffer) >= 100:
        client.metrics.ingest_batch(metrics_buffer)
        metrics_buffer.clear()
```

### Pattern 3: Cost Budget Monitoring

```javascript
async function checkBudget(teamId) {
  const budgets = await client.costs.listBudgets({ teamId });

  for (const budget of budgets) {
    if (budget.utilizationPercentage > 80) {
      console.warn(`Budget ${budget.name} is at ${budget.utilizationPercentage}%`);

      // Send alert
      await sendAlert({
        type: 'budget_threshold',
        budget: budget.name,
        utilization: budget.utilizationPercentage
      });
    }

    if (budget.utilizationPercentage >= 100) {
      console.error(`Budget ${budget.name} exceeded!`);
      // Take action (e.g., disable LLM access)
    }
  }
}

// Check every hour
setInterval(() => checkBudget('team-id'), 3600000);
```

---

## Error Handling

### Standard Error Format

```javascript
try {
  await client.users.get('invalid-id');
} catch (error) {
  console.log(error.code);       // 'NOT_FOUND'
  console.log(error.message);    // 'User not found'
  console.log(error.status);     // 404
  console.log(error.details);    // Additional context
}
```

### Error Types

```javascript
class APIError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Usage
if (error instanceof APIError) {
  switch (error.code) {
    case 'AUTHENTICATION_FAILED':
      // Redirect to login
      break;
    case 'POLICY_VIOLATION':
      // Handle policy violation
      break;
    case 'RATE_LIMIT_EXCEEDED':
      // Implement backoff
      break;
    default:
      // General error handling
  }
}
```

---

## Rate Limiting

### Handling Rate Limits

```javascript
class RateLimitHandler {
  constructor(client) {
    this.client = client;
    this.requestQueue = [];
    this.processing = false;
  }

  async request(fn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;
    const { fn, resolve, reject } = this.requestQueue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        // Re-queue request
        this.requestQueue.unshift({ fn, resolve, reject });

        // Wait for rate limit reset
        const resetTime = error.details.reset * 1000;
        const now = Date.now();
        const waitTime = resetTime - now;

        await sleep(Math.max(waitTime, 0));
      } else {
        reject(error);
      }
    } finally {
      this.processing = false;
      this.processQueue();
    }
  }
}

// Usage
const rateLimiter = new RateLimitHandler(client);
const users = await rateLimiter.request(() => client.users.list());
```

---

## Retry Logic

### Exponential Backoff

```python
import time
import random

def retry_with_backoff(func, max_retries=3, base_delay=1):
    """Retry function with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as error:
            if attempt == max_retries - 1:
                raise

            if error.code in ['RATE_LIMIT_EXCEEDED', 'SERVICE_UNAVAILABLE']:
                # Exponential backoff with jitter
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f'Retry attempt {attempt + 1} after {delay:.2f}s')
                time.sleep(delay)
            else:
                raise

# Usage
users = retry_with_backoff(lambda: client.users.list())
```

---

## Testing

### Mock Client (JavaScript)

```javascript
class MockLLMGovernanceClient {
  constructor() {
    this.users = {
      list: jest.fn().mockResolvedValue({
        users: [
          { id: '1', email: 'test@example.com', name: 'Test User' }
        ],
        total: 1
      }),
      get: jest.fn().mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      })
    };
  }
}

// Usage in tests
describe('UserService', () => {
  let client;

  beforeEach(() => {
    client = new MockLLMGovernanceClient();
  });

  it('should list users', async () => {
    const users = await client.users.list();
    expect(users.total).toBe(1);
    expect(client.users.list).toHaveBeenCalled();
  });
});
```

### Integration Tests (Python)

```python
import pytest
from llm_governance import Client

@pytest.fixture
def client():
    return Client(
        base_url='http://localhost:8080/api/v1',
        access_token='test-token'
    )

def test_list_users(client):
    users = client.users.list(limit=10)
    assert len(users) <= 10
    assert all(hasattr(u, 'email') for u in users)

def test_create_policy(client):
    policy = client.policies.create(
        name='Test Policy',
        policy_type='cost',
        rules={'max_cost_per_day': 100.00},
        enforcement_level='strict'
    )
    assert policy.id is not None
    assert policy.name == 'Test Policy'
```

---

## Best Practices

### 1. Use Environment Variables

```javascript
// ❌ Bad
const client = new LLMGovernance({
  accessToken: 'sk-1234567890abcdef...'
});

// ✅ Good
const client = new LLMGovernance({
  accessToken: process.env.LLM_GOV_ACCESS_TOKEN
});
```

### 2. Implement Token Refresh

```javascript
// ✅ Good
const client = new LLMGovernance({
  accessToken: getStoredToken(),
  refreshToken: getStoredRefreshToken(),
  onTokenRefresh: (tokens) => {
    storeTokens(tokens);
  }
});
```

### 3. Handle Errors Gracefully

```javascript
// ✅ Good
async function getUserSafely(id) {
  try {
    return await client.users.get(id);
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return null;
    }
    throw error;
  }
}
```

### 4. Use Batch Operations

```javascript
// ❌ Bad
for (const metric of metrics) {
  await client.metrics.ingest(metric);
}

// ✅ Good
await client.metrics.ingestBatch(metrics);
```

### 5. Monitor Rate Limits

```javascript
// ✅ Good
client.on('rateLimit', (limits) => {
  console.log(`Rate limit: ${limits.remaining}/${limits.limit}`);

  if (limits.remaining < 10) {
    console.warn('Approaching rate limit!');
  }
});
```

### 6. Log API Calls

```javascript
// ✅ Good
client.on('request', (request) => {
  logger.info('API Request', {
    method: request.method,
    url: request.url,
    duration: request.duration
  });
});
```

### 7. Use Timeouts

```javascript
// ✅ Good
const client = new LLMGovernance({
  accessToken: '...',
  timeout: 30000  // 30 seconds
});
```

### 8. Cache Responses

```javascript
// ✅ Good
const cache = new Map();

async function getUser(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const user = await client.users.get(id);
  cache.set(id, user);

  // Expire after 5 minutes
  setTimeout(() => cache.delete(id), 300000);

  return user;
}
```

### 9. Validate Input

```javascript
// ✅ Good
function createPolicy(data) {
  if (!data.name || data.name.length < 3) {
    throw new Error('Policy name must be at least 3 characters');
  }

  if (!['cost', 'security', 'usage'].includes(data.policyType)) {
    throw new Error('Invalid policy type');
  }

  return client.policies.create(data);
}
```

### 10. Use TypeScript

```typescript
// ✅ Good
import { LLMGovernance, User, Policy } from '@llm-governance/sdk-js';

const client = new LLMGovernance({ accessToken: '...' });

async function getUser(id: string): Promise<User> {
  return client.users.get(id);
}

async function createPolicy(data: {
  name: string;
  policyType: 'cost' | 'security' | 'usage';
  rules: Record<string, any>;
}): Promise<Policy> {
  return client.policies.create(data);
}
```

---

## Additional Resources

- [API Reference](./API_REFERENCE.md)
- [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [OpenAPI Specifications](./openapi/)
- [SDK Documentation](https://docs.llm-governance.example.com/sdks)
- [Code Examples](https://github.com/llm-governance/examples)

---

**Last Updated:** November 16, 2025
**Version:** 1.0.0
