# LLM Governance Dashboard - Monitoring Guide

Comprehensive monitoring, alerting, and observability guide.

## Table of Contents

- [Overview](#overview)
- [Prometheus Setup](#prometheus-setup)
- [Grafana Dashboards](#grafana-dashboards)
- [AlertManager](#alertmanager)
- [Logging](#logging)
- [Tracing](#tracing)
- [Metrics](#metrics)

## Overview

The monitoring stack consists of:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notification
- **Loki** (optional): Log aggregation
- **Jaeger** (optional): Distributed tracing

## Prometheus Setup

### Deploy Prometheus

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
```

### Access Prometheus

```bash
# Port forward
kubectl port-forward svc/prometheus 9090:9090 -n monitoring

# Open browser
open http://localhost:9090
```

### Prometheus Queries

#### Request Rate

```promql
# Total requests per second
sum(rate(http_requests_total[5m]))

# Requests per service
sum(rate(http_requests_total[5m])) by (service)
```

#### Error Rate

```promql
# Error percentage
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100
```

#### Response Time

```promql
# P95 response time
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)

# P99 response time
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

#### Resource Usage

```promql
# CPU usage by pod
sum(rate(container_cpu_usage_seconds_total{namespace="llm-governance"}[5m])) by (pod)

# Memory usage by pod
sum(container_memory_working_set_bytes{namespace="llm-governance"}) by (pod)

# Database connections
db_connection_pool_active{namespace="llm-governance"}
```

## Grafana Dashboards

### Deploy Grafana

```bash
kubectl apply -f k8s/monitoring/grafana.yaml
```

### Access Grafana

```bash
# Port forward
kubectl port-forward svc/grafana 3000:80 -n monitoring

# Open browser
open http://localhost:3000

# Default credentials: admin/admin123
```

### Pre-configured Dashboards

#### 1. Service Overview Dashboard

Displays:
- Request rate per service
- Error rate
- Response time (p50, p95, p99)
- Active connections
- CPU and memory usage

#### 2. Database Dashboard

Displays:
- Query performance
- Connection pool usage
- Slow queries
- Replication lag
- Disk usage

#### 3. Business Metrics Dashboard

Displays:
- API calls per LLM provider
- Cost per request
- Token usage
- Policy violations
- User activity

### Creating Custom Dashboards

1. Login to Grafana
2. Click "+" → "Create Dashboard"
3. Add panel
4. Select data source: Prometheus
5. Enter PromQL query
6. Customize visualization
7. Save dashboard

Example Panel:

```json
{
  "title": "API Request Rate",
  "targets": [{
    "expr": "sum(rate(http_requests_total[5m])) by (service)",
    "legendFormat": "{{service}}"
  }],
  "type": "graph"
}
```

## AlertManager

### Deploy AlertManager

```bash
kubectl apply -f k8s/monitoring/alertmanager.yaml
```

### Configure Alerts

Alerts are defined in Prometheus rules (`k8s/monitoring/prometheus.yaml`):

```yaml
groups:
- name: llm-governance-alerts
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
      /
      sum(rate(http_requests_total[5m])) by (service)
      > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate on {{ $labels.service }}"
      description: "Error rate is {{ $value | humanizePercentage }}"
```

### Alert Routing

Configure in AlertManager config:

```yaml
route:
  receiver: 'default'
  routes:
  - match:
      severity: critical
    receiver: 'critical'
  - match:
      severity: warning
    receiver: 'warning'

receivers:
- name: 'critical'
  slack_configs:
  - channel: '#alerts-critical'
    api_url: 'YOUR_SLACK_WEBHOOK'
  pagerduty_configs:
  - service_key: 'YOUR_PAGERDUTY_KEY'
```

### Alert Notifications

#### Slack

```yaml
receivers:
- name: 'slack'
  slack_configs:
  - api_url: 'YOUR_WEBHOOK_URL'
    channel: '#llm-governance-alerts'
    title: 'Alert: {{ .GroupLabels.alertname }}'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

#### Email

```yaml
receivers:
- name: 'email'
  email_configs:
  - to: 'oncall@example.com'
    from: 'alerts@example.com'
    smarthost: 'smtp.example.com:587'
    auth_username: 'alerts@example.com'
    auth_password: 'password'
```

#### PagerDuty

```yaml
receivers:
- name: 'pagerduty'
  pagerduty_configs:
  - service_key: 'YOUR_SERVICE_KEY'
    description: '{{ .CommonAnnotations.summary }}'
```

## Logging

### Structured Logging

All services use structured JSON logging:

```rust
use tracing::{info, error};

info!(
    service = "auth-service",
    user_id = %user.id,
    action = "login",
    "User logged in successfully"
);

error!(
    service = "auth-service",
    error = %err,
    "Authentication failed"
);
```

### Collecting Logs

#### Using kubectl

```bash
# View logs
kubectl logs -f deployment/api-gateway -n llm-governance

# View logs from all pods
kubectl logs -f -l app=api-gateway -n llm-governance

# View logs from specific time
kubectl logs --since=1h deployment/api-gateway -n llm-governance

# View previous container logs
kubectl logs --previous deployment/api-gateway -n llm-governance
```

#### Using Loki (Optional)

Deploy Loki:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false
```

Query logs in Grafana:

```logql
{namespace="llm-governance", app="api-gateway"} |= "error"
```

### Log Aggregation

For production, consider:
- **AWS**: CloudWatch Logs
- **Azure**: Azure Monitor Logs
- **GCP**: Cloud Logging
- **Self-hosted**: ELK Stack or Loki

## Tracing

### Distributed Tracing with Jaeger

Deploy Jaeger:

```bash
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/jaeger-operator.yaml

kubectl apply -f - <<EOF
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: llm-governance-jaeger
  namespace: monitoring
spec:
  strategy: production
  storage:
    type: elasticsearch
EOF
```

### Instrument Services

```rust
use opentelemetry::global;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::Registry;

let tracer = opentelemetry_jaeger::new_pipeline()
    .with_service_name("api-gateway")
    .install_simple()?;

let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
let subscriber = Registry::default().with(telemetry);
tracing::subscriber::set_global_default(subscriber)?;
```

### View Traces

```bash
kubectl port-forward svc/llm-governance-jaeger-query 16686:16686 -n monitoring
open http://localhost:16686
```

## Metrics

### Application Metrics

Each service exposes metrics at `/metrics`:

```rust
use prometheus::{IntCounter, Histogram, Encoder, TextEncoder};

// Counter for requests
let requests_total = IntCounter::new(
    "http_requests_total",
    "Total HTTP requests"
)?;

// Histogram for latency
let request_duration = Histogram::new(
    "http_request_duration_seconds",
    "HTTP request latency"
)?;

// Export metrics
#[get("/metrics")]
async fn metrics() -> Result<String> {
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    let mut buffer = vec![];
    encoder.encode(&metric_families, &mut buffer)?;
    Ok(String::from_utf8(buffer)?)
}
```

### Key Metrics to Monitor

#### Golden Signals

1. **Latency**: Response time
2. **Traffic**: Request rate
3. **Errors**: Error rate
4. **Saturation**: Resource usage

#### Application Metrics

- Request count
- Request duration
- Error count
- Active connections
- Queue depth

#### System Metrics

- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Pod restarts

#### Business Metrics

- API calls per provider
- Cost per request
- Token usage
- Policy violations
- Active users

## Dashboards Configuration

### Import Dashboard from JSON

1. Go to Grafana
2. Click "+" → "Import"
3. Upload dashboard JSON
4. Select data source
5. Click "Import"

### Export Dashboard

```bash
# Export dashboard
curl -u admin:admin123 \
  http://localhost:3000/api/dashboards/uid/DASHBOARD_UID \
  > dashboard.json
```

## Best Practices

### 1. Use Labels Effectively

```promql
# Good - specific labels
http_requests_total{service="api-gateway", method="GET", status="200"}

# Bad - too generic
http_requests_total
```

### 2. Set Appropriate Recording Rules

```yaml
groups:
- name: rules
  interval: 30s
  rules:
  - record: job:http_requests_total:rate5m
    expr: sum(rate(http_requests_total[5m])) by (job)
```

### 3. Configure Retention

```yaml
# Prometheus retention
--storage.tsdb.retention.time=30d
--storage.tsdb.retention.size=50GB
```

### 4. Use Federation for Multi-Cluster

```yaml
scrape_configs:
- job_name: 'federate'
  scrape_interval: 15s
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
      - '{job="kubernetes-apiservers"}'
      - '{job="kubernetes-nodes"}'
  static_configs:
  - targets:
    - 'prometheus-cluster1:9090'
    - 'prometheus-cluster2:9090'
```

## Monitoring Checklist

- [ ] Prometheus deployed and scraping
- [ ] Grafana dashboards configured
- [ ] Alerts configured in AlertManager
- [ ] Notification channels set up
- [ ] Log aggregation configured
- [ ] Distributed tracing enabled
- [ ] SLI/SLO defined
- [ ] On-call rotation configured
- [ ] Runbooks created
- [ ] Regular review of alerts

## Troubleshooting

### Prometheus not scraping

```bash
# Check service discovery
kubectl get servicemonitor -n llm-governance

# Check Prometheus targets
# Go to Prometheus UI → Status → Targets

# Check pod annotations
kubectl get pod <pod-name> -n llm-governance -o yaml | grep prometheus
```

### Grafana dashboard not loading data

```bash
# Test Prometheus connectivity
curl http://prometheus:9090/api/v1/query?query=up

# Check data source configuration in Grafana
# Settings → Data Sources → Prometheus → Test
```

## Next Steps

- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Scaling Guide](SCALING.md)
- [Security Best Practices](SECURITY.md)
