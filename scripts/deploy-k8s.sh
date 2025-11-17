#!/usr/bin/env bash

# ============================================================================
# deploy-k8s.sh - Kubernetes Deployment
# ============================================================================
# Builds Docker images, pushes to registry, and deploys to Kubernetes
# Usage: ./scripts/deploy-k8s.sh [--use-helm] [--namespace NAME] [--registry REGISTRY]
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Default options
USE_HELM=false
NAMESPACE="llm-governance"
REGISTRY="localhost:5000"
IMAGE_TAG="latest"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --use-helm)
            USE_HELM=true
            shift
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--use-helm] [--namespace NAME] [--registry REGISTRY] [--tag TAG]"
            exit 1
            ;;
    esac
done

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# ============================================================================
# Deployment Process
# ============================================================================

print_header "LLM Governance Dashboard - Kubernetes Deployment"

echo -e "${BOLD}Configuration:${NC}"
echo -e "  Namespace:    ${NAMESPACE}"
echo -e "  Registry:     ${REGISTRY}"
echo -e "  Image Tag:    ${IMAGE_TAG}"
echo -e "  Use Helm:     ${USE_HELM}"
echo ""

# ----------------------------------------------------------------------------
# Step 1: Check Prerequisites
# ----------------------------------------------------------------------------
print_step "Checking prerequisites..."

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install kubectl."
    exit 1
fi
print_success "kubectl is installed"

if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install Docker."
    exit 1
fi
print_success "Docker is installed"

if [[ "$USE_HELM" == true ]]; then
    if ! command -v helm &> /dev/null; then
        print_error "Helm not found. Please install Helm or use --no-helm."
        exit 1
    fi
    print_success "Helm is installed"
fi

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Check your kubeconfig."
    exit 1
fi
print_success "Connected to Kubernetes cluster"

# ----------------------------------------------------------------------------
# Step 2: Create Namespace
# ----------------------------------------------------------------------------
print_step "Creating namespace..."

if kubectl get namespace "$NAMESPACE" &> /dev/null; then
    print_info "Namespace '$NAMESPACE' already exists"
else
    kubectl create namespace "$NAMESPACE"
    print_success "Namespace '$NAMESPACE' created"
fi

# ----------------------------------------------------------------------------
# Step 3: Build Docker Images
# ----------------------------------------------------------------------------
print_step "Building Docker images..."

SERVICES=(
    "auth-service"
    "user-service"
    "policy-service"
    "audit-service"
    "metrics-service"
    "cost-service"
    "api-gateway"
    "integration-service"
)

for service in "${SERVICES[@]}"; do
    print_info "Building ${service}..."

    IMAGE_NAME="${REGISTRY}/llm-governance-${service}:${IMAGE_TAG}"

    if docker build -t "$IMAGE_NAME" -f "services/${service}/Dockerfile" . ; then
        print_success "${service} image built: ${IMAGE_NAME}"
    else
        print_error "Failed to build ${service}"
        exit 1
    fi
done

# Build frontend
print_info "Building frontend..."
FRONTEND_IMAGE="${REGISTRY}/llm-governance-frontend:${IMAGE_TAG}"

if docker build -t "$FRONTEND_IMAGE" -f "frontend/Dockerfile" ./frontend ; then
    print_success "Frontend image built: ${FRONTEND_IMAGE}"
else
    print_error "Failed to build frontend"
    exit 1
fi

# ----------------------------------------------------------------------------
# Step 4: Push Images to Registry
# ----------------------------------------------------------------------------
print_step "Pushing images to registry..."

# Push service images
for service in "${SERVICES[@]}"; do
    IMAGE_NAME="${REGISTRY}/llm-governance-${service}:${IMAGE_TAG}"
    print_info "Pushing ${service}..."

    if docker push "$IMAGE_NAME"; then
        print_success "${service} pushed to registry"
    else
        print_warning "Failed to push ${service} (may need registry login)"
    fi
done

# Push frontend image
print_info "Pushing frontend..."
if docker push "$FRONTEND_IMAGE"; then
    print_success "Frontend pushed to registry"
else
    print_warning "Failed to push frontend"
fi

# ----------------------------------------------------------------------------
# Step 5: Deploy to Kubernetes
# ----------------------------------------------------------------------------
print_step "Deploying to Kubernetes..."

if [[ "$USE_HELM" == true ]]; then
    # Deploy using Helm
    print_info "Deploying with Helm..."

    if [[ -d "helm/llm-governance" ]]; then
        helm upgrade --install llm-governance helm/llm-governance \
            --namespace "$NAMESPACE" \
            --set image.registry="$REGISTRY" \
            --set image.tag="$IMAGE_TAG" \
            --wait \
            --timeout 10m

        print_success "Helm deployment completed"
    else
        print_error "Helm chart not found at helm/llm-governance"
        exit 1
    fi
else
    # Deploy using kubectl
    print_info "Deploying with kubectl..."

    if [[ -d "k8s" ]]; then
        # Update image tags in manifests (if using kustomize)
        if [[ -f "k8s/kustomization.yaml" ]]; then
            print_info "Using Kustomize..."
            kubectl apply -k k8s --namespace "$NAMESPACE"
        else
            # Apply manifests directly
            print_info "Applying Kubernetes manifests..."

            # Apply in order
            kubectl apply -f k8s/namespace.yaml --namespace "$NAMESPACE" || true
            kubectl apply -f k8s/configmap.yaml --namespace "$NAMESPACE" || true
            kubectl apply -f k8s/secrets.yaml --namespace "$NAMESPACE" || true
            kubectl apply -f k8s/database.yaml --namespace "$NAMESPACE" || true
            kubectl apply -f k8s/services/ --namespace "$NAMESPACE" || true
            kubectl apply -f k8s/ingress.yaml --namespace "$NAMESPACE" || true
        fi

        print_success "Kubernetes manifests applied"
    else
        print_error "Kubernetes manifests not found at k8s/"
        exit 1
    fi
fi

# ----------------------------------------------------------------------------
# Step 6: Wait for Rollout
# ----------------------------------------------------------------------------
print_step "Waiting for deployment rollout..."

DEPLOYMENTS=(
    "auth-service"
    "user-service"
    "policy-service"
    "audit-service"
    "metrics-service"
    "cost-service"
    "api-gateway"
    "integration-service"
    "frontend"
)

for deployment in "${DEPLOYMENTS[@]}"; do
    print_info "Waiting for ${deployment}..."

    if kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout=5m; then
        print_success "${deployment} is ready"
    else
        print_warning "${deployment} rollout did not complete in time"
    fi
done

# ----------------------------------------------------------------------------
# Step 7: Display Status
# ----------------------------------------------------------------------------
print_header "Deployment Status"

echo -e "${BOLD}Pods:${NC}"
kubectl get pods -n "$NAMESPACE"
echo ""

echo -e "${BOLD}Services:${NC}"
kubectl get services -n "$NAMESPACE"
echo ""

echo -e "${BOLD}Ingress:${NC}"
kubectl get ingress -n "$NAMESPACE" 2>/dev/null || echo "  No ingress configured"
echo ""

# Get ingress URL if available
INGRESS_HOST=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")

if [[ -n "$INGRESS_HOST" ]]; then
    echo -e "${BOLD}Access URL:${NC}"
    echo -e "  https://${INGRESS_HOST}"
    echo ""
fi

echo -e "${BOLD}Useful Commands:${NC}"
echo -e "  View logs:        ${CYAN}kubectl logs -f deployment/<service> -n ${NAMESPACE}${NC}"
echo -e "  Port forward:     ${CYAN}kubectl port-forward svc/api-gateway 8080:8080 -n ${NAMESPACE}${NC}"
echo -e "  Get pods:         ${CYAN}kubectl get pods -n ${NAMESPACE}${NC}"
echo -e "  Describe pod:     ${CYAN}kubectl describe pod <pod-name> -n ${NAMESPACE}${NC}"
echo -e "  Scale deployment: ${CYAN}kubectl scale deployment/<service> --replicas=3 -n ${NAMESPACE}${NC}"
echo -e "  Delete all:       ${CYAN}kubectl delete namespace ${NAMESPACE}${NC}"
echo ""

if [[ "$USE_HELM" == true ]]; then
    echo -e "${BOLD}Helm Commands:${NC}"
    echo -e "  Status:  ${CYAN}helm status llm-governance -n ${NAMESPACE}${NC}"
    echo -e "  Upgrade: ${CYAN}helm upgrade llm-governance helm/llm-governance -n ${NAMESPACE}${NC}"
    echo -e "  Delete:  ${CYAN}helm uninstall llm-governance -n ${NAMESPACE}${NC}"
    echo ""
fi

print_success "Kubernetes deployment completed!"

exit 0
