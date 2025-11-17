# LLM Governance Dashboard - Troubleshooting Guide

Common issues and their solutions.

## Table of Contents

- [Pod Issues](#pod-issues)
- [Database Issues](#database-issues)
- [Network Issues](#network-issues)
- [Performance Issues](#performance-issues)
- [Authentication Issues](#authentication-issues)

## Pod Issues

### Pod Not Starting

**Symptoms**: Pod stuck in `Pending` or `CrashLoopBackOff`

**Diagnosis**:

```bash
kubectl describe pod <pod-name> -n llm-governance
kubectl logs <pod-name> -n llm-governance
kubectl get events -n llm-governance --sort-by='.lastTimestamp'
```

**Common Causes**:

1. **Insufficient Resources**
   ```bash
   # Check node resources
   kubectl top nodes
   kubectl describe node <node-name>
   ```

   **Solution**: Scale cluster or reduce resource requests

2. **Image Pull Error**
   ```bash
   # Check if image exists
   kubectl describe pod <pod-name> -n llm-governance | grep -A 5 Events
   ```

   **Solution**: Verify image name and registry credentials

3. **Configuration Error**
   ```bash
   # Check environment variables
   kubectl exec <pod-name> -n llm-governance -- env
   ```

   **Solution**: Verify ConfigMap and Secret values

### Pod Restart Loop

**Diagnosis**:

```bash
kubectl get pod <pod-name> -n llm-governance
kubectl logs --previous <pod-name> -n llm-governance
```

**Solutions**:

1. Check health probe configuration
2. Increase startup time limits
3. Review application logs for errors

## Database Issues

### Connection Refused

**Symptoms**: Services can't connect to PostgreSQL

**Diagnosis**:

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:16 --restart=Never -n llm-governance -- \
  psql -h postgres-service -U postgres -d llm_governance

# Check database pod
kubectl get pod -l app=postgres -n llm-governance
kubectl logs -l app=postgres -n llm-governance
```

**Solutions**:

1. Verify database service
   ```bash
   kubectl get svc postgres-service -n llm-governance
   ```

2. Check network policies
   ```bash
   kubectl get networkpolicy -n llm-governance
   ```

3. Verify credentials
   ```bash
   kubectl get secret llm-governance-secrets -n llm-governance -o yaml
   ```

### Slow Queries

**Diagnosis**:

```sql
-- Check slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Solutions**:

1. Add missing indexes
2. Optimize queries
3. Increase connection pool
4. Consider read replicas

### Connection Pool Exhausted

**Symptoms**: "Too many connections" errors

**Solutions**:

```yaml
# Increase max connections in deployment
env:
- name: DATABASE_MAX_CONNECTIONS
  value: "100"  # Increase from 50
```

## Network Issues

### Service Unreachable

**Diagnosis**:

```bash
# Check service
kubectl get svc -n llm-governance
kubectl describe svc <service-name> -n llm-governance

# Check endpoints
kubectl get endpoints <service-name> -n llm-governance

# Test from another pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n llm-governance -- \
  curl http://api-gateway:8080/health
```

**Solutions**:

1. Verify selector labels match
2. Check network policies
3. Ensure pods are ready

### Ingress Not Working

**Diagnosis**:

```bash
# Check ingress
kubectl get ingress -n llm-governance
kubectl describe ingress llm-governance-ingress -n llm-governance

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -f -n ingress-nginx deployment/ingress-nginx-controller
```

**Solutions**:

1. Verify DNS configuration
2. Check TLS certificate
3. Review ingress annotations
4. Ensure backend service is healthy

### Inter-Service Communication Failure

**Diagnosis**:

```bash
# Check DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -n llm-governance -- \
  nslookup auth-service.llm-governance.svc.cluster.local

# Test connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n llm-governance -- \
  curl -v http://auth-service:8081/health
```

**Solutions**:

1. Check CoreDNS
   ```bash
   kubectl get pods -n kube-system -l k8s-app=kube-dns
   kubectl logs -n kube-system -l k8s-app=kube-dns
   ```

2. Verify service names and namespaces

3. Check network policies allow traffic

## Performance Issues

### High Latency

**Diagnosis**:

```bash
# Check pod resource usage
kubectl top pods -n llm-governance

# Check HPA status
kubectl get hpa -n llm-governance

# Review Prometheus metrics
curl 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(le,service))'
```

**Solutions**:

1. Scale horizontally
   ```bash
   kubectl scale deployment api-gateway --replicas=5 -n llm-governance
   ```

2. Optimize database queries

3. Enable caching

4. Review application logs for bottlenecks

### High Memory Usage

**Diagnosis**:

```bash
# Check memory usage
kubectl top pods -n llm-governance

# Get detailed pod metrics
kubectl describe pod <pod-name> -n llm-governance | grep -A 5 "Limits\|Requests"
```

**Solutions**:

1. Increase memory limits
2. Fix memory leaks in application
3. Enable garbage collection tuning
4. Review caching strategy

## Authentication Issues

### JWT Token Invalid

**Symptoms**: 401 Unauthorized errors

**Diagnosis**:

```bash
# Check auth service logs
kubectl logs -f deployment/auth-service -n llm-governance

# Verify JWT secret
kubectl get secret llm-governance-secrets -n llm-governance -o jsonpath='{.data.AUTH_JWT_SECRET}' | base64 -d
```

**Solutions**:

1. Verify JWT secret is consistent across services
2. Check token expiration
3. Ensure proper token format

### OAuth Not Working

**Diagnosis**:

```bash
# Check OAuth configuration
kubectl get secret llm-governance-secrets -n llm-governance -o yaml

# Check auth service logs
kubectl logs -f deployment/auth-service -n llm-governance | grep oauth
```

**Solutions**:

1. Verify OAuth credentials
2. Check redirect URIs
3. Ensure callback URL is accessible

## Debugging Commands

### Interactive Shell

```bash
# Run shell in existing pod
kubectl exec -it <pod-name> -n llm-governance -- /bin/sh

# Run debug pod
kubectl run -it --rm debug --image=alpine --restart=Never -n llm-governance -- /bin/sh
```

### Network Debugging

```bash
# Test connectivity
kubectl run -it --rm netshoot --image=nicolaka/netshoot --restart=Never -n llm-governance

# Inside netshoot
nslookup postgres-service
curl http://api-gateway:8080/health
telnet postgres-service 5432
```

### Database Debugging

```bash
# Connect to database
kubectl port-forward svc/postgres-service 5432:5432 -n llm-governance
psql -h localhost -U postgres -d llm_governance

# Check connections
SELECT * FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('llm_governance'));
```

## Common Error Messages

### "ImagePullBackOff"

**Cause**: Cannot pull container image

**Solution**:
- Verify image name
- Check image pull secrets
- Ensure registry is accessible

### "CrashLoopBackOff"

**Cause**: Container keeps crashing

**Solution**:
- Check application logs
- Review health probe configuration
- Verify environment variables

### "OOMKilled"

**Cause**: Out of memory

**Solution**:
- Increase memory limits
- Fix memory leaks
- Optimize application

### "Evicted"

**Cause**: Node out of resources

**Solution**:
- Add more nodes
- Reduce resource requests
- Clean up unused resources

## Emergency Procedures

### Complete Service Outage

1. Check cluster health
   ```bash
   kubectl get nodes
   kubectl get pods --all-namespaces
   ```

2. Scale up critical services
   ```bash
   kubectl scale deployment api-gateway --replicas=10 -n llm-governance
   ```

3. Check recent changes
   ```bash
   kubectl rollout history deployment/api-gateway -n llm-governance
   ```

4. Rollback if needed
   ```bash
   kubectl rollout undo deployment/api-gateway -n llm-governance
   ```

### Database Recovery

1. Check backups
   ```bash
   aws rds describe-db-snapshots --db-instance-identifier llm-governance-postgres
   ```

2. Restore from backup if needed

3. Run migrations
   ```bash
   ./database/migrations/run.sh
   ```

## Support Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Internal Slack: #llm-governance-support
- On-call: Use PagerDuty

## Escalation Procedures

1. **Level 1** - Check this guide
2. **Level 2** - Review logs and metrics
3. **Level 3** - Contact on-call engineer
4. **Level 4** - Page platform team
