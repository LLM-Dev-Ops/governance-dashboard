# LLM Governance Helm Chart

This Helm chart deploys the LLM Governance Dashboard and all its microservices to Kubernetes.

## Prerequisites

- Kubernetes 1.23+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure
- cert-manager (optional, for TLS certificates)
- nginx-ingress-controller or other ingress controller

## Installing the Chart

```bash
# Add the Helm repository (if published)
helm repo add llm-governance https://charts.example.com
helm repo update

# Install the chart with the release name 'llm-governance'
helm install llm-governance llm-governance/llm-governance \
  --namespace llm-governance \
  --create-namespace \
  --values values.yaml
```

Or from local directory:

```bash
helm install llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --create-namespace \
  --values custom-values.yaml
```

## Uninstalling the Chart

```bash
helm uninstall llm-governance --namespace llm-governance
```

## Configuration

The following table lists the configurable parameters of the LLM Governance chart and their default values.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.domain` | Main domain | `llm-governance.example.com` |
| `global.apiDomain` | API domain | `api.llm-governance.example.com` |
| `global.imageRegistry` | Global image registry | `docker.io` |
| `apiGateway.replicaCount` | Number of API Gateway replicas | `3` |
| `apiGateway.resources.requests.cpu` | CPU request | `200m` |
| `apiGateway.resources.limits.memory` | Memory limit | `1Gi` |
| `postgresql.persistence.size` | PostgreSQL storage size | `100Gi` |
| `redis.persistence.size` | Redis storage size | `10Gi` |
| `ingress.enabled` | Enable ingress | `true` |
| `monitoring.enabled` | Enable monitoring | `true` |

See `values.yaml` for all available parameters.

## Customization

Create a custom values file:

```yaml
# custom-values.yaml
global:
  domain: llm.mycompany.com
  apiDomain: api.llm.mycompany.com

apiGateway:
  replicaCount: 5
  resources:
    requests:
      cpu: 500m
      memory: 512Mi

postgresql:
  persistence:
    size: 200Gi
    storageClass: fast-ssd

secrets:
  database:
    password: "secure-password-here"
  jwt:
    secret: "your-jwt-secret"
```

Then install:

```bash
helm install llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --create-namespace \
  --values custom-values.yaml
```

## Upgrading

```bash
helm upgrade llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --values custom-values.yaml
```

## Production Considerations

1. **Secrets Management**: Do not store secrets in values.yaml. Use external secrets management:
   - AWS Secrets Manager with External Secrets Operator
   - HashiCorp Vault
   - Sealed Secrets

2. **Storage**: Configure appropriate storage classes for your cloud provider:
   - AWS: `gp3`, `io2`
   - GCP: `pd-ssd`, `pd-balanced`
   - Azure: `managed-premium`, `managed-csi`

3. **Ingress**: Configure your domain and TLS certificates

4. **Resource Limits**: Adjust based on your workload

5. **Autoscaling**: Configure HPA based on your traffic patterns

## Examples

### AWS EKS

```yaml
global:
  storageClass: gp3

ingress:
  className: alb
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
```

### GCP GKE

```yaml
global:
  storageClass: pd-ssd

ingress:
  className: gce
```

### Azure AKS

```yaml
global:
  storageClass: managed-premium

ingress:
  className: azure
```
