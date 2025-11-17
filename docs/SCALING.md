# LLM Governance Dashboard - Scaling Guide

Guide for scaling the LLM Governance Dashboard to handle increased load and traffic.

## Table of Contents

- [Overview](#overview)
- [Horizontal Pod Autoscaling](#horizontal-pod-autoscaling)
- [Vertical Scaling](#vertical-scaling)
- [Database Scaling](#database-scaling)
- [Caching Strategies](#caching-strategies)
- [Performance Optimization](#performance-optimization)
- [Load Testing](#load-testing)

## Overview

The LLM Governance Dashboard is designed for horizontal scalability. Each microservice can scale independently based on demand.

### Current Architecture

- **Frontend**: 3-10 replicas (CPU-based autoscaling)
- **API Gateway**: 3-10 replicas (CPU + memory autoscaling)
- **Auth Service**: 3-10 replicas
- **Other Services**: 3-10 replicas each
- **PostgreSQL**: Single instance with read replicas (RDS, Cloud SQL, etc.)
- **Redis**: Single instance or cluster mode

## Horizontal Pod Autoscaling

### HPA Configuration

All services have HPA enabled by default:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: llm-governance
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Monitoring HPA

```bash
# Watch HPA status
kubectl get hpa -n llm-governance -w

# Describe HPA for detailed metrics
kubectl describe hpa api-gateway-hpa -n llm-governance

# Check current metrics
kubectl top pods -n llm-governance
```

### Custom Metrics

For more advanced autoscaling based on custom metrics:

```yaml
metrics:
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "1000"
```

## Vertical Scaling

### Adjusting Resource Limits

Edit deployment resource limits:

```bash
# Edit deployment
kubectl edit deployment api-gateway -n llm-governance

# Or use kubectl set resources
kubectl set resources deployment api-gateway \
  --limits=cpu=2000m,memory=2Gi \
  --requests=cpu=500m,memory=512Mi \
  -n llm-governance
```

### Recommended Resource Configurations

#### Low Traffic (<100 requests/s)

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

#### Medium Traffic (100-1000 requests/s)

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

#### High Traffic (>1000 requests/s)

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
```

## Database Scaling

### PostgreSQL Read Replicas

#### AWS RDS

```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier llm-governance-read-replica \
  --source-db-instance-identifier llm-governance-postgres \
  --db-instance-class db.t3.large
```

#### Application Configuration

```rust
// Configure read/write splitting in application
let write_pool = PgPoolOptions::new()
    .connect(&env::var("DATABASE_WRITE_URL")?).await?;

let read_pool = PgPoolOptions::new()
    .connect(&env::var("DATABASE_READ_URL")?).await?;
```

### Connection Pooling

Optimize database connections:

```yaml
env:
- name: DATABASE_MAX_CONNECTIONS
  value: "50"
- name: DATABASE_MIN_CONNECTIONS
  value: "10"
- name: DATABASE_ACQUIRE_TIMEOUT_SECONDS
  value: "30"
```

### TimescaleDB Optimization

For metrics-service with time-series data:

```sql
-- Create hypertable for metrics
CREATE TABLE metrics (
  time TIMESTAMPTZ NOT NULL,
  service VARCHAR(50),
  metric_name VARCHAR(100),
  value DOUBLE PRECISION
);

SELECT create_hypertable('metrics', 'time');

-- Add compression
ALTER TABLE metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'service,metric_name'
);

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('metrics', INTERVAL '7 days');

-- Add retention policy (drop data older than 90 days)
SELECT add_retention_policy('metrics', INTERVAL '90 days');
```

## Caching Strategies

### Redis Configuration

#### Single Instance

```yaml
redis:
  enabled: true
  persistence:
    enabled: true
    size: 10Gi
  resources:
    limits:
      cpu: 1000m
      memory: 2Gi
```

#### Redis Cluster

For high availability and scalability:

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: llm-governance-redis
  namespace: llm-governance
spec:
  clusterSize: 3
  redisLeader:
    replicas: 3
  redisFollower:
    replicas: 3
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

### Application-Level Caching

```rust
use redis::AsyncCommands;

// Cache user sessions
async fn cache_session(
    redis: &mut redis::aio::Connection,
    session_id: &str,
    user_data: &UserData,
    ttl: usize
) -> Result<()> {
    let data = serde_json::to_string(user_data)?;
    redis.set_ex(session_id, data, ttl).await?;
    Ok(())
}

// Cache API responses
async fn cache_response(
    redis: &mut redis::aio::Connection,
    cache_key: &str,
    response: &ApiResponse,
    ttl: usize
) -> Result<()> {
    let data = serde_json::to_string(response)?;
    redis.set_ex(cache_key, data, ttl).await?;
    Ok(())
}
```

## Performance Optimization

### 1. Database Query Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_policies_organization_id ON policies(organization_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
```

### 2. Connection Pool Tuning

```rust
// Optimize connection pool settings
let pool = PgPoolOptions::new()
    .max_connections(50)
    .min_connections(10)
    .acquire_timeout(Duration::from_secs(30))
    .idle_timeout(Duration::from_secs(600))
    .max_lifetime(Duration::from_secs(1800))
    .connect(&database_url)
    .await?;
```

### 3. Enable HTTP/2

```yaml
# In ingress configuration
annotations:
  nginx.ingress.kubernetes.io/use-http2: "true"
```

### 4. Enable gRPC for Service Communication

For inter-service communication, consider using gRPC instead of HTTP:

```rust
// Define gRPC service
service AuthService {
    rpc ValidateToken (TokenRequest) returns (TokenResponse);
    rpc GetUserInfo (UserRequest) returns (UserResponse);
}
```

## Load Testing

### Using K6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

export default function() {
  let response = http.get('https://api.llm-governance.example.com/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

Run the test:

```bash
k6 run load-test.js
```

### Using Apache Bench

```bash
# Test API Gateway with 1000 requests, 100 concurrent
ab -n 1000 -c 100 https://api.llm-governance.example.com/health

# With authentication
ab -n 1000 -c 100 -H "Authorization: Bearer TOKEN" \
  https://api.llm-governance.example.com/api/policies
```

### Using Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class LLMGovernanceUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def get_policies(self):
        self.client.get("/api/policies", headers={
            "Authorization": f"Bearer {self.token}"
        })

    @task(2)
    def get_metrics(self):
        self.client.get("/api/metrics")

    @task(1)
    def create_audit_log(self):
        self.client.post("/api/audit/logs", json={
            "action": "test",
            "resource": "policy"
        })
```

Run:

```bash
locust -f locustfile.py --host=https://api.llm-governance.example.com
```

## Scaling Checklist

- [ ] Configure HPA for all services
- [ ] Set appropriate resource limits
- [ ] Enable database read replicas
- [ ] Optimize connection pooling
- [ ] Implement caching strategy
- [ ] Add database indexes
- [ ] Enable compression for time-series data
- [ ] Configure CDN for static assets
- [ ] Implement rate limiting
- [ ] Monitor and analyze metrics
- [ ] Perform regular load tests
- [ ] Plan for capacity based on growth

## Monitoring Scaling

```bash
# Watch pod scaling
watch kubectl get hpa -n llm-governance

# Monitor resource usage
kubectl top pods -n llm-governance
kubectl top nodes

# Check Prometheus metrics
curl http://prometheus:9090/api/v1/query?query=rate(http_requests_total[5m])
```

## Cost Optimization

### 1. Use Spot Instances

For non-critical workloads:

```yaml
# In node pool configuration
nodeSelector:
  node.kubernetes.io/instance-type: spot
tolerations:
- key: "spot"
  operator: "Equal"
  value: "true"
  effect: "NoSchedule"
```

### 2. Right-size Resources

Regularly review and adjust resource requests/limits based on actual usage.

### 3. Enable Cluster Autoscaler

```bash
# AWS EKS
eksctl create cluster --managed --asg-access
```

## Next Steps

- [Monitoring Guide](MONITORING.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Performance Tuning](PERFORMANCE.md)
