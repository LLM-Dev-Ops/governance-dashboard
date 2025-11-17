# Webhooks Documentation

Real-time event notifications via HTTP callbacks.

---

## Table of Contents

- [Overview](#overview)
- [Event Types](#event-types)
- [Webhook Setup](#webhook-setup)
- [Payload Format](#payload-format)
- [Security](#security)
- [Retry Logic](#retry-logic)
- [Testing Webhooks](#testing-webhooks)
- [Best Practices](#best-practices)

---

## Overview

Webhooks allow you to receive real-time notifications when events occur in the LLM Governance Dashboard. Instead of polling the API, webhooks push data to your server when events happen.

### How Webhooks Work

```
┌─────────────┐         Event        ┌──────────────┐
│ LLM Gov API │ ──────────────────> │ Your Server  │
└─────────────┘                      └──────────────┘
                  HTTP POST
                  + Event Payload
                  + Signature
```

---

## Event Types

### Authentication Events

**Event:** `auth.login.success`
**Description:** User successfully logged in
**Payload:**
```json
{
  "event": "auth.login.success",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "ip_address": "192.168.1.1",
    "mfa_used": false
  }
}
```

**Event:** `auth.login.failed`
**Description:** Failed login attempt
**Payload:**
```json
{
  "event": "auth.login.failed",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    "email": "user@example.com",
    "ip_address": "192.168.1.1",
    "reason": "invalid_credentials"
  }
}
```

**Event:** `auth.mfa.enabled`
**Description:** User enabled MFA

**Event:** `auth.mfa.disabled`
**Description:** User disabled MFA

**Event:** `auth.password.changed`
**Description:** User changed password

---

### Policy Events

**Event:** `policy.violation`
**Description:** Policy violation detected
**Payload:**
```json
{
  "event": "policy.violation",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    "policy_id": "policy-uuid-1",
    "policy_name": "Daily Cost Limit",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "team_id": "team-uuid-1",
    "violation": {
      "rule": "max_cost_per_day",
      "threshold": 100.00,
      "actual": 125.50,
      "severity": "high"
    },
    "context": {
      "provider": "openai",
      "model": "gpt-4",
      "request_cost": 0.05
    }
  }
}
```

**Event:** `policy.created`
**Description:** New policy created

**Event:** `policy.updated`
**Description:** Policy updated

**Event:** `policy.deleted`
**Description:** Policy deleted

---

### Budget Events

**Event:** `budget.threshold.warning`
**Description:** Budget approaching threshold (80%)
**Payload:**
```json
{
  "event": "budget.threshold.warning",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    "budget_id": "budget-uuid-1",
    "budget_name": "Monthly Team Budget",
    "amount": 1000.00,
    "spent": 850.00,
    "remaining": 150.00,
    "utilization_percentage": 85.0,
    "threshold": 80,
    "scope": "team",
    "team_id": "team-uuid-1"
  }
}
```

**Event:** `budget.exceeded`
**Description:** Budget limit exceeded
**Payload:**
```json
{
  "event": "budget.exceeded",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    "budget_id": "budget-uuid-1",
    "budget_name": "Monthly Team Budget",
    "amount": 1000.00,
    "spent": 1025.50,
    "overage": 25.50,
    "utilization_percentage": 102.55,
    "scope": "team",
    "team_id": "team-uuid-1"
  }
}
```

**Event:** `budget.reset`
**Description:** Budget period reset

---

### Cost Events

**Event:** `cost.anomaly.detected`
**Description:** Unusual cost spike detected
**Payload:**
```json
{
  "event": "cost.anomaly.detected",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "team_id": "team-uuid-1",
    "current_cost": 250.00,
    "expected_cost": 50.00,
    "deviation_percentage": 400,
    "period": "hourly",
    "provider": "openai",
    "model": "gpt-4"
  }
}
```

---

### Integration Events

**Event:** `integration.provider.down`
**Description:** LLM provider unavailable
**Payload:**
```json
{
  "event": "integration.provider.down",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    "provider": "openai",
    "circuit_state": "open",
    "failure_count": 5,
    "last_error": "Connection timeout",
    "recovery_time_estimate": "2025-11-16T12:30:00Z"
  }
}
```

**Event:** `integration.provider.recovered`
**Description:** LLM provider recovered

---

### User Events

**Event:** `user.created`
**Description:** New user created

**Event:** `user.updated`
**Description:** User information updated

**Event:** `user.deleted`
**Description:** User deleted

**Event:** `user.role.assigned`
**Description:** Role assigned to user

**Event:** `user.role.revoked`
**Description:** Role removed from user

---

## Webhook Setup

### Create Webhook Endpoint

**Request:**
```bash
curl -X POST https://api.llm-governance.example.com/api/v1/webhooks \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/llm-gov",
    "events": [
      "policy.violation",
      "budget.exceeded",
      "cost.anomaly.detected"
    ],
    "secret": "your-webhook-secret-key",
    "enabled": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook-uuid-1",
    "url": "https://your-server.com/webhooks/llm-gov",
    "events": [
      "policy.violation",
      "budget.exceeded",
      "cost.anomaly.detected"
    ],
    "secret": "your-webhook-secret-key",
    "enabled": true,
    "created_at": "2025-11-16T12:00:00Z"
  }
}
```

### List Webhooks

```bash
GET /webhooks
```

### Update Webhook

```bash
PUT /webhooks/{id}
```

### Delete Webhook

```bash
DELETE /webhooks/{id}
```

### Test Webhook

```bash
POST /webhooks/{id}/test
```

---

## Payload Format

### Standard Payload

Every webhook payload follows this format:

```json
{
  "event": "event.name.here",
  "webhook_id": "webhook-uuid-1",
  "timestamp": "2025-11-16T12:00:00Z",
  "data": {
    // Event-specific data
  }
}
```

### Headers

```http
POST /webhooks/llm-gov HTTP/1.1
Host: your-server.com
Content-Type: application/json
X-LLM-Gov-Event: policy.violation
X-LLM-Gov-Signature: sha256=a3f5b8c9d2e1...
X-LLM-Gov-Delivery: delivery-uuid-1
User-Agent: LLM-Governance-Webhooks/1.0
```

---

## Security

### Signature Verification

All webhook requests are signed with HMAC-SHA256.

**Verify Signature (JavaScript):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Express middleware
app.post('/webhooks/llm-gov', (req, res) => {
  const signature = req.headers['x-llm-gov-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  processWebhook(req.body);
  res.status(200).json({ received: true });
});
```

**Verify Signature (Python):**
```python
import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected_signature = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

# Flask example
@app.route('/webhooks/llm-gov', methods=['POST'])
def webhook():
    signature = request.headers.get('X-LLM-Gov-Signature')
    payload = request.get_data(as_text=True)

    if not verify_webhook_signature(payload, signature, webhook_secret):
        return jsonify({'error': 'Invalid signature'}), 401

    # Process webhook
    process_webhook(request.json)
    return jsonify({'received': True}), 200
```

### IP Allowlist

Webhook requests come from these IP ranges:
- `52.0.0.0/8` (Production)
- `54.0.0.0/8` (Production)
- `127.0.0.1` (Testing)

### HTTPS Only

Webhook URLs must use HTTPS. HTTP URLs will be rejected.

---

## Retry Logic

### Retry Strategy

If your endpoint fails to respond with 2xx, we retry:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 15 minutes |
| 5 | 1 hour |

After 5 failed attempts, the webhook will be disabled.

### Idempotency

Use the `X-LLM-Gov-Delivery` header to detect duplicate deliveries:

```javascript
const processedDeliveries = new Set();

app.post('/webhooks/llm-gov', (req, res) => {
  const deliveryId = req.headers['x-llm-gov-delivery'];

  if (processedDeliveries.has(deliveryId)) {
    return res.status(200).json({ received: true });
  }

  // Process webhook
  processWebhook(req.body);
  processedDeliveries.add(deliveryId);

  res.status(200).json({ received: true });
});
```

---

## Testing Webhooks

### Local Development with ngrok

```bash
# Start ngrok
ngrok http 3000

# Use ngrok URL for webhook
# https://abc123.ngrok.io/webhooks/llm-gov
```

### Webhook Testing Tools

- **RequestBin**: https://requestbin.com
- **Webhook.site**: https://webhook.site
- **Ngrok Inspector**: http://localhost:4040

### Manual Testing

```bash
# Test webhook endpoint
curl -X POST https://api.llm-governance.example.com/api/v1/webhooks/{id}/test \
  -H "Authorization: Bearer <access_token>"
```

This sends a test payload to your webhook URL.

---

## Best Practices

### 1. Respond Quickly

```javascript
// ✅ Good - Respond immediately, process async
app.post('/webhooks/llm-gov', (req, res) => {
  // Respond quickly
  res.status(200).json({ received: true });

  // Process asynchronously
  setImmediate(() => {
    processWebhook(req.body);
  });
});
```

### 2. Handle Duplicates

```javascript
// ✅ Good - Check delivery ID
const deliveryId = req.headers['x-llm-gov-delivery'];
if (await isProcessed(deliveryId)) {
  return res.status(200).json({ received: true });
}

await markAsProcessed(deliveryId);
```

### 3. Log Everything

```javascript
// ✅ Good - Log all webhook events
app.post('/webhooks/llm-gov', (req, res) => {
  logger.info('Webhook received', {
    event: req.body.event,
    deliveryId: req.headers['x-llm-gov-delivery'],
    timestamp: req.body.timestamp
  });

  // ...
});
```

### 4. Monitor Failures

Set up alerts for webhook failures:

```javascript
// ✅ Good - Alert on repeated failures
if (failureCount > 3) {
  await sendAlert({
    type: 'webhook_failures',
    count: failureCount,
    webhook_id: webhookId
  });
}
```

### 5. Use Queues

```javascript
// ✅ Good - Use message queue
app.post('/webhooks/llm-gov', async (req, res) => {
  await queue.push({
    type: 'webhook',
    event: req.body.event,
    data: req.body.data
  });

  res.status(200).json({ received: true });
});
```

---

## Example Implementations

### Express.js

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/webhooks/llm-gov', (req, res) => {
  const signature = req.headers['x-llm-gov-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Handle different event types
  switch (req.body.event) {
    case 'policy.violation':
      handlePolicyViolation(req.body.data);
      break;

    case 'budget.exceeded':
      handleBudgetExceeded(req.body.data);
      break;

    case 'cost.anomaly.detected':
      handleCostAnomaly(req.body.data);
      break;

    default:
      console.log('Unknown event:', req.body.event);
  }

  res.status(200).json({ received: true });
});

function handlePolicyViolation(data) {
  console.log('Policy violation:', data.policy_name);
  // Send alert, block user, etc.
}

function handleBudgetExceeded(data) {
  console.log('Budget exceeded:', data.budget_name);
  // Send alert, disable LLM access, etc.
}

function handleCostAnomaly(data) {
  console.log('Cost anomaly detected');
  // Investigate unusual spending
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

### Flask (Python)

```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)

WEBHOOK_SECRET = 'your-webhook-secret'

def verify_signature(payload: str, signature: str) -> bool:
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/webhooks/llm-gov', methods=['POST'])
def webhook():
    signature = request.headers.get('X-LLM-Gov-Signature')
    payload = request.get_data(as_text=True)

    if not verify_signature(payload, signature):
        return jsonify({'error': 'Invalid signature'}), 401

    data = request.json
    event = data['event']

    if event == 'policy.violation':
        handle_policy_violation(data['data'])
    elif event == 'budget.exceeded':
        handle_budget_exceeded(data['data'])
    elif event == 'cost.anomaly.detected':
        handle_cost_anomaly(data['data'])

    return jsonify({'received': True}), 200

def handle_policy_violation(data):
    print(f"Policy violation: {data['policy_name']}")

def handle_budget_exceeded(data):
    print(f"Budget exceeded: {data['budget_name']}")

def handle_cost_anomaly(data):
    print("Cost anomaly detected")

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Support

For webhook issues:
- Email: webhooks-support@llm-governance.example.com
- Documentation: https://docs.llm-governance.example.com/webhooks

---

**Last Updated:** November 16, 2025
**Version:** 1.0.0
