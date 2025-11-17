# LLM-Governance-Dashboard Architecture

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Data Architecture](#data-architecture)
5. [Technology Stack](#technology-stack)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)
8. [Integration Patterns](#integration-patterns)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

The LLM-Governance-Dashboard follows a modern, microservices-based architecture with clear separation of concerns across multiple layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web UI     │  │   Mobile     │  │  Embedded    │          │
│  │ (TypeScript) │  │   Client     │  │  Component   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   API Gateway     │
                    │   (Load Balance)  │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     API Layer (Rust)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ REST API     │  │  gRPC API    │  │ WebSocket    │          │
│  │ Service      │  │  Service     │  │ Gateway      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  Service Layer (Rust Microservices)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Policy       │  │  Metrics     │  │  Audit       │          │
│  │ Service      │  │  Service     │  │  Service     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ User/Auth    │  │ Analytics    │  │ Integration  │          │
│  │ Service      │  │ Service      │  │ Service      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  Data Access Layer (Rust)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │  TimescaleDB │  │   Redis      │          │
│  │ Repository   │  │  Repository  │  │   Cache      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │  TimescaleDB │  │   Redis      │          │
│  │ (Primary)    │  │  (Metrics)   │  │   (Cache)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  S3/Object   │  │ Elasticsearch│                            │
│  │  Storage     │  │  (Logs)      │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Architectural Principles

1. **Microservices**: Independently deployable services with clear domain boundaries
2. **Event-Driven**: Asynchronous communication using message queues for loose coupling
3. **API-First**: Well-defined REST and gRPC APIs for all service interactions
4. **Stateless Services**: Services maintain no session state for horizontal scalability
5. **Defense in Depth**: Multiple security layers from edge to data
6. **Observability**: Comprehensive logging, metrics, and tracing across all components
7. **Resilience**: Circuit breakers, retries, and graceful degradation
8. **Domain-Driven Design**: Services aligned with business domains

### 1.3 Core Components

#### Client Layer
- **Web UI**: Primary TypeScript-based dashboard interface
- **Mobile Client**: Responsive mobile application
- **Embeddable Components**: Reusable widget library for integration

#### API Layer
- **API Gateway**: Request routing, rate limiting, authentication
- **REST API**: Standard HTTP/JSON endpoints
- **gRPC API**: High-performance binary protocol for internal services
- **WebSocket Gateway**: Real-time bi-directional communication

#### Service Layer
- **Policy Service**: Governance policy management and evaluation
- **Metrics Service**: Performance metrics collection and aggregation
- **Audit Service**: Comprehensive audit logging and compliance tracking
- **User/Auth Service**: Identity, authentication, and authorization
- **Analytics Service**: Advanced analytics and reporting
- **Integration Service**: LLM DevOps platform integration

#### Data Layer
- **PostgreSQL**: Primary relational data store
- **TimescaleDB**: Time-series metrics and analytics
- **Redis**: Caching and session management
- **Elasticsearch**: Full-text search and log aggregation
- **S3/Object Storage**: Large file and backup storage

---

## 2. Backend Architecture

### 2.1 Microservices Design

The backend follows a microservices architecture with clear service boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Policy Service                                │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Responsibilities:                                      │     │
│  │ - Policy CRUD operations                              │     │
│  │ - Policy validation and evaluation                    │     │
│  │ - Policy versioning and history                       │     │
│  │ - Policy template management                          │     │
│  │ - Compliance checking                                 │     │
│  └────────────────────────────────────────────────────────┘     │
│  API: /api/v1/policies/*                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Metrics Service                               │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Responsibilities:                                      │     │
│  │ - Real-time metrics ingestion                         │     │
│  │ - Metrics aggregation and rollups                     │     │
│  │ - Threshold monitoring and alerting                   │     │
│  │ - Performance trending                                │     │
│  │ - Custom metric definitions                           │     │
│  └────────────────────────────────────────────────────────┘     │
│  API: /api/v1/metrics/*                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Audit Service                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Responsibilities:                                      │     │
│  │ - Comprehensive audit trail                           │     │
│  │ - Immutable log storage                               │     │
│  │ - Compliance reporting                                │     │
│  │ - Event correlation                                   │     │
│  │ - Audit log search and export                         │     │
│  └────────────────────────────────────────────────────────┘     │
│  API: /api/v1/audit/*                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  User/Auth Service                               │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Responsibilities:                                      │     │
│  │ - User management (CRUD)                              │     │
│  │ - Authentication (OAuth2, JWT, SSO)                   │     │
│  │ - Authorization (RBAC, ABAC)                          │     │
│  │ - Session management                                  │     │
│  │ - API key management                                  │     │
│  └────────────────────────────────────────────────────────┘     │
│  API: /api/v1/users/*, /api/v1/auth/*                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Analytics Service                              │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Responsibilities:                                      │     │
│  │ - Advanced analytics and insights                     │     │
│  │ - Custom report generation                            │     │
│  │ - Data visualization preparation                      │     │
│  │ - Trend analysis and forecasting                      │     │
│  │ - Dashboard configuration                             │     │
│  └────────────────────────────────────────────────────────┘     │
│  API: /api/v1/analytics/*                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Integration Service                             │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Responsibilities:                                      │     │
│  │ - LLM DevOps platform integration                     │     │
│  │ - External system connectors                          │     │
│  │ - Event streaming                                     │     │
│  │ - Webhook management                                  │     │
│  │ - Data synchronization                                │     │
│  └────────────────────────────────────────────────────────┘     │
│  API: /api/v1/integrations/*                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 API Layer Design

#### 2.2.1 REST API Endpoints

**Standard REST Resource Pattern**:
```
HTTP Method | Endpoint                          | Description
------------|-----------------------------------|----------------------------------
GET         | /api/v1/{resource}                | List resources (paginated)
GET         | /api/v1/{resource}/{id}           | Get specific resource
POST        | /api/v1/{resource}                | Create new resource
PUT         | /api/v1/{resource}/{id}           | Update resource (full)
PATCH       | /api/v1/{resource}/{id}           | Update resource (partial)
DELETE      | /api/v1/{resource}/{id}           | Delete resource
GET         | /api/v1/{resource}/{id}/history   | Get resource version history
POST        | /api/v1/{resource}/search         | Advanced search with filters
```

**Core API Endpoints**:

```
Policy Management:
  GET    /api/v1/policies
  POST   /api/v1/policies
  GET    /api/v1/policies/{id}
  PUT    /api/v1/policies/{id}
  DELETE /api/v1/policies/{id}
  POST   /api/v1/policies/{id}/evaluate
  GET    /api/v1/policies/{id}/violations
  GET    /api/v1/policy-templates

Metrics:
  GET    /api/v1/metrics
  POST   /api/v1/metrics/query
  GET    /api/v1/metrics/timeseries
  POST   /api/v1/metrics/ingest
  GET    /api/v1/metrics/aggregates
  POST   /api/v1/metrics/alerts

Audit Logs:
  GET    /api/v1/audit/logs
  POST   /api/v1/audit/search
  GET    /api/v1/audit/export
  GET    /api/v1/audit/compliance-report

Users & Auth:
  POST   /api/v1/auth/login
  POST   /api/v1/auth/logout
  POST   /api/v1/auth/refresh
  GET    /api/v1/users
  POST   /api/v1/users
  GET    /api/v1/users/{id}
  PUT    /api/v1/users/{id}
  GET    /api/v1/users/{id}/permissions
  POST   /api/v1/roles
  GET    /api/v1/roles

Analytics:
  POST   /api/v1/analytics/query
  GET    /api/v1/analytics/dashboards
  POST   /api/v1/analytics/reports
  GET    /api/v1/analytics/insights

Integrations:
  GET    /api/v1/integrations
  POST   /api/v1/integrations/webhook
  GET    /api/v1/integrations/events/stream
```

#### 2.2.2 gRPC Service Definitions

**High-Performance Internal Communication**:

```protobuf
// policy.proto
service PolicyService {
  rpc CreatePolicy(CreatePolicyRequest) returns (Policy);
  rpc GetPolicy(GetPolicyRequest) returns (Policy);
  rpc ListPolicies(ListPoliciesRequest) returns (PolicyList);
  rpc UpdatePolicy(UpdatePolicyRequest) returns (Policy);
  rpc DeletePolicy(DeletePolicyRequest) returns (Empty);
  rpc EvaluatePolicy(EvaluatePolicyRequest) returns (PolicyEvaluation);
}

// metrics.proto
service MetricsService {
  rpc IngestMetrics(stream MetricBatch) returns (IngestResponse);
  rpc QueryMetrics(MetricsQuery) returns (stream MetricData);
  rpc GetAggregates(AggregateRequest) returns (AggregateResponse);
  rpc SubscribeAlerts(AlertSubscription) returns (stream Alert);
}

// audit.proto
service AuditService {
  rpc LogEvent(AuditEvent) returns (Empty);
  rpc LogEventBatch(stream AuditEvent) returns (Empty);
  rpc QueryLogs(LogQuery) returns (stream AuditLog);
  rpc ExportLogs(ExportRequest) returns (stream LogChunk);
}

// auth.proto
service AuthService {
  rpc Authenticate(AuthRequest) returns (AuthToken);
  rpc ValidateToken(TokenValidation) returns (ValidationResult);
  rpc Authorize(AuthzRequest) returns (AuthzDecision);
  rpc RefreshToken(RefreshRequest) returns (AuthToken);
}
```

#### 2.2.3 WebSocket API

**Real-Time Streaming Endpoints**:

```
WebSocket: ws://api.example.com/ws/v1/metrics/stream
  - Subscribe to real-time metrics updates
  - Message format: JSON
  - Subscription filters: metric_type, resource_id, tags

WebSocket: ws://api.example.com/ws/v1/alerts/stream
  - Real-time alert notifications
  - Priority-based routing
  - Alert acknowledgment

WebSocket: ws://api.example.com/ws/v1/events/stream
  - Event stream for dashboard updates
  - Multiple topic subscriptions
  - Replay support for missed events
```

### 2.3 Data Access Layer

```rust
// Repository Pattern Implementation

pub trait Repository<T> {
    async fn find_by_id(&self, id: &Uuid) -> Result<Option<T>>;
    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<T>>;
    async fn create(&self, entity: &T) -> Result<T>;
    async fn update(&self, entity: &T) -> Result<T>;
    async fn delete(&self, id: &Uuid) -> Result<bool>;
}

// Policy Repository
pub struct PolicyRepository {
    pool: PgPool,
    cache: Arc<RedisCache>,
}

impl PolicyRepository {
    pub async fn find_active_policies(&self) -> Result<Vec<Policy>> {
        // Check cache first
        if let Some(cached) = self.cache.get("active_policies").await? {
            return Ok(cached);
        }

        // Query database
        let policies = sqlx::query_as!(
            Policy,
            "SELECT * FROM policies WHERE status = 'active' ORDER BY priority DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        // Cache results
        self.cache.set("active_policies", &policies, 300).await?;

        Ok(policies)
    }
}

// Metrics Repository (TimescaleDB)
pub struct MetricsRepository {
    pool: PgPool,
}

impl MetricsRepository {
    pub async fn insert_metric(&self, metric: &Metric) -> Result<()> {
        sqlx::query!(
            "INSERT INTO metrics (timestamp, metric_name, value, tags)
             VALUES ($1, $2, $3, $4)",
            metric.timestamp,
            metric.name,
            metric.value,
            &metric.tags
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn query_timeseries(
        &self,
        metric_name: &str,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        interval: &str,
    ) -> Result<Vec<TimeseriesPoint>> {
        sqlx::query_as!(
            TimeseriesPoint,
            "SELECT
                time_bucket($1, timestamp) as bucket,
                avg(value) as avg_value,
                max(value) as max_value,
                min(value) as min_value
             FROM metrics
             WHERE metric_name = $2
               AND timestamp >= $3
               AND timestamp <= $4
             GROUP BY bucket
             ORDER BY bucket",
            interval,
            metric_name,
            start,
            end
        )
        .fetch_all(&self.pool)
        .await
    }
}
```

### 2.4 Integration Layer

```rust
// LLM DevOps Platform Integration

pub trait LLMDevOpsIntegration {
    async fn fetch_model_metrics(&self, model_id: &str) -> Result<ModelMetrics>;
    async fn fetch_deployment_status(&self, deployment_id: &str) -> Result<DeploymentStatus>;
    async fn fetch_policy_violations(&self) -> Result<Vec<PolicyViolation>>;
    async fn register_webhook(&self, event_type: &str, callback_url: &str) -> Result<String>;
}

pub struct LLMDevOpsClient {
    http_client: reqwest::Client,
    grpc_client: Option<GrpcClient>,
    base_url: String,
    api_key: String,
}

impl LLMDevOpsClient {
    pub async fn new(config: &IntegrationConfig) -> Result<Self> {
        let client = Self {
            http_client: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()?,
            grpc_client: config.use_grpc.then(|| {
                GrpcClient::connect(config.grpc_endpoint.clone())
            }),
            base_url: config.base_url.clone(),
            api_key: config.api_key.clone(),
        };

        Ok(client)
    }
}

// Event Streaming Integration
pub struct EventStreamProcessor {
    kafka_consumer: StreamConsumer,
    handlers: HashMap<String, Box<dyn EventHandler>>,
}

impl EventStreamProcessor {
    pub async fn start(&mut self) -> Result<()> {
        self.kafka_consumer.subscribe(&["llm-events"])?;

        loop {
            let message = self.kafka_consumer.recv().await?;
            let event: Event = serde_json::from_slice(message.payload())?;

            if let Some(handler) = self.handlers.get(&event.event_type) {
                handler.handle(event).await?;
            }
        }
    }
}
```

### 2.5 Authentication/Authorization Middleware

```rust
// JWT-based Authentication Middleware

pub struct AuthMiddleware {
    jwt_validator: JwtValidator,
    rbac_engine: RbacEngine,
}

impl AuthMiddleware {
    pub async fn authenticate(&self, token: &str) -> Result<UserContext> {
        // Validate JWT token
        let claims = self.jwt_validator.validate(token)?;

        // Extract user context
        let user_context = UserContext {
            user_id: claims.sub,
            roles: claims.roles,
            permissions: claims.permissions,
            tenant_id: claims.tenant_id,
        };

        Ok(user_context)
    }

    pub async fn authorize(&self, context: &UserContext, resource: &str, action: &str) -> Result<bool> {
        // Check RBAC permissions
        let decision = self.rbac_engine.evaluate(
            &context.user_id,
            resource,
            action,
            &context.roles,
        ).await?;

        Ok(decision.is_allowed())
    }
}

// Role-Based Access Control (RBAC)
pub struct RbacEngine {
    policy_store: Arc<PolicyStore>,
}

impl RbacEngine {
    pub async fn evaluate(
        &self,
        user_id: &str,
        resource: &str,
        action: &str,
        roles: &[String],
    ) -> Result<AuthzDecision> {
        // Fetch applicable policies
        let policies = self.policy_store
            .get_policies_for_roles(roles)
            .await?;

        // Evaluate policies
        for policy in policies {
            if policy.matches(resource, action) {
                return Ok(AuthzDecision::Allow);
            }
        }

        Ok(AuthzDecision::Deny)
    }
}

// Actix-web Middleware Integration
pub async fn auth_middleware(
    req: ServiceRequest,
    srv: &mut impl Service,
) -> Result<ServiceResponse, Error> {
    // Extract token from Authorization header
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let token = token.ok_or_else(|| ErrorUnauthorized("Missing token"))?;

    // Authenticate
    let auth = req.app_data::<Data<AuthMiddleware>>()
        .ok_or_else(|| ErrorInternalServerError("Auth service unavailable"))?;

    let user_context = auth.authenticate(token).await
        .map_err(|_| ErrorUnauthorized("Invalid token"))?;

    // Store user context in request extensions
    req.extensions_mut().insert(user_context);

    // Continue to next middleware/handler
    srv.call(req).await
}
```

---

## 3. Frontend Architecture

### 3.1 Framework Selection: SvelteKit

**Selected Framework**: **SvelteKit**

**Justification**:
1. **Performance**: Compiles to vanilla JavaScript, smaller bundle sizes
2. **Developer Experience**: Less boilerplate, reactive by default
3. **SSR/SSG Support**: Built-in server-side rendering and static generation
4. **TypeScript Support**: First-class TypeScript integration
5. **Routing**: File-based routing with layouts
6. **Real-time**: Excellent WebSocket and SSE support
7. **Ecosystem**: Growing ecosystem with good tooling

**Alternative Considered**: React with Next.js
- More mature ecosystem
- Larger community and job market
- More third-party components
- Decision: SvelteKit chosen for better performance and DX

### 3.2 Component Hierarchy

```
src/
├── routes/                          # SvelteKit routes (file-based routing)
│   ├── +layout.svelte              # Root layout
│   ├── +page.svelte                # Home/Dashboard
│   ├── policies/
│   │   ├── +page.svelte            # Policy list
│   │   ├── [id]/
│   │   │   ├── +page.svelte        # Policy detail
│   │   │   └── +page.ts            # Policy loader
│   │   └── new/
│   │       └── +page.svelte        # Create policy
│   ├── metrics/
│   │   ├── +page.svelte            # Metrics dashboard
│   │   ├── real-time/
│   │   │   └── +page.svelte        # Real-time metrics
│   │   └── analytics/
│   │       └── +page.svelte        # Analytics view
│   ├── audit/
│   │   ├── +page.svelte            # Audit logs
│   │   └── compliance/
│   │       └── +page.svelte        # Compliance reports
│   ├── users/
│   │   ├── +page.svelte            # User management
│   │   └── [id]/
│   │       └── +page.svelte        # User detail
│   └── settings/
│       └── +page.svelte            # Settings
│
├── lib/                             # Reusable library code
│   ├── components/                  # UI Components
│   │   ├── common/                  # Common/shared components
│   │   │   ├── Button.svelte
│   │   │   ├── Card.svelte
│   │   │   ├── Modal.svelte
│   │   │   ├── Table.svelte
│   │   │   ├── Pagination.svelte
│   │   │   └── Loader.svelte
│   │   ├── charts/                  # Chart components
│   │   │   ├── LineChart.svelte
│   │   │   ├── BarChart.svelte
│   │   │   ├── PieChart.svelte
│   │   │   ├── TimeSeriesChart.svelte
│   │   │   └── Heatmap.svelte
│   │   ├── policy/                  # Policy-specific components
│   │   │   ├── PolicyCard.svelte
│   │   │   ├── PolicyEditor.svelte
│   │   │   ├── PolicyEvaluator.svelte
│   │   │   └── ViolationList.svelte
│   │   ├── metrics/                 # Metrics components
│   │   │   ├── MetricCard.svelte
│   │   │   ├── MetricTrend.svelte
│   │   │   ├── AlertPanel.svelte
│   │   │   └── RealTimeMetrics.svelte
│   │   ├── audit/                   # Audit components
│   │   │   ├── AuditLogTable.svelte
│   │   │   ├── ComplianceReport.svelte
│   │   │   └── EventTimeline.svelte
│   │   └── layout/                  # Layout components
│   │       ├── Header.svelte
│   │       ├── Sidebar.svelte
│   │       ├── Footer.svelte
│   │       └── Breadcrumb.svelte
│   │
│   ├── stores/                      # State management
│   │   ├── auth.ts                  # Authentication state
│   │   ├── policies.ts              # Policy state
│   │   ├── metrics.ts               # Metrics state
│   │   ├── audit.ts                 # Audit state
│   │   ├── notifications.ts         # Notification state
│   │   └── ui.ts                    # UI state (theme, sidebar, etc.)
│   │
│   ├── services/                    # API services
│   │   ├── api.ts                   # Base API client
│   │   ├── policy-service.ts        # Policy API
│   │   ├── metrics-service.ts       # Metrics API
│   │   ├── audit-service.ts         # Audit API
│   │   ├── auth-service.ts          # Auth API
│   │   └── websocket-service.ts     # WebSocket client
│   │
│   ├── types/                       # TypeScript types
│   │   ├── policy.ts
│   │   ├── metric.ts
│   │   ├── audit.ts
│   │   ├── user.ts
│   │   └── api.ts
│   │
│   ├── utils/                       # Utility functions
│   │   ├── date.ts                  # Date formatting
│   │   ├── validation.ts            # Form validation
│   │   ├── format.ts                # Data formatting
│   │   └── auth.ts                  # Auth utilities
│   │
│   └── config/                      # Configuration
│       ├── api-endpoints.ts
│       ├── charts.ts
│       └── theme.ts
│
├── static/                          # Static assets
│   ├── favicon.png
│   └── fonts/
│
└── tests/                           # Tests
    ├── unit/
    ├── integration/
    └── e2e/
```

### 3.3 State Management

**Svelte Stores Pattern**:

```typescript
// lib/stores/auth.ts
import { writable, derived } from 'svelte/store';
import type { User, AuthToken } from '$lib/types/user';

interface AuthState {
  user: User | null;
  token: AuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  return {
    subscribe,
    login: async (email: string, password: string) => {
      update(state => ({ ...state, isLoading: true }));
      try {
        const response = await authService.login(email, password);
        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          isLoading: false,
        });
        // Store token in localStorage
        localStorage.setItem('auth_token', response.token.access_token);
      } catch (error) {
        update(state => ({ ...state, isLoading: false }));
        throw error;
      }
    },
    logout: () => {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      localStorage.removeItem('auth_token');
    },
    refresh: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        update(state => ({ ...state, isLoading: false }));
        return;
      }
      try {
        const response = await authService.validateToken(token);
        set({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        localStorage.removeItem('auth_token');
      }
    },
  };
}

export const auth = createAuthStore();

// Derived store for user permissions
export const permissions = derived(
  auth,
  $auth => $auth.user?.permissions || []
);
```

```typescript
// lib/stores/metrics.ts
import { writable, derived } from 'svelte/store';
import type { Metric, MetricFilter } from '$lib/types/metric';

interface MetricsState {
  metrics: Metric[];
  filters: MetricFilter;
  isLoading: boolean;
  error: string | null;
}

function createMetricsStore() {
  const { subscribe, set, update } = writable<MetricsState>({
    metrics: [],
    filters: {},
    isLoading: false,
    error: null,
  });

  return {
    subscribe,
    fetchMetrics: async (filters: MetricFilter) => {
      update(state => ({ ...state, isLoading: true, error: null, filters }));
      try {
        const metrics = await metricsService.query(filters);
        update(state => ({ ...state, metrics, isLoading: false }));
      } catch (error) {
        update(state => ({
          ...state,
          error: error.message,
          isLoading: false,
        }));
      }
    },
    addMetric: (metric: Metric) => {
      update(state => ({
        ...state,
        metrics: [...state.metrics, metric],
      }));
    },
    clearMetrics: () => {
      update(state => ({ ...state, metrics: [] }));
    },
  };
}

export const metrics = createMetricsStore();
```

### 3.4 Real-Time Data Streaming

```typescript
// lib/services/websocket-service.ts
import { metrics } from '$lib/stores/metrics';
import { notifications } from '$lib/stores/notifications';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private url: string) {}

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.subscribe('metrics.realtime');
      this.subscribe('alerts');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.reconnect();
    };
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'metric':
        metrics.addMetric(message.payload);
        break;
      case 'alert':
        notifications.addAlert(message.payload);
        break;
      case 'policy_violation':
        notifications.addViolation(message.payload);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  subscribe(topic: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        topic,
      }));
    }
  }

  unsubscribe(topic: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        topic,
      }));
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
      notifications.addError('Lost connection to server');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage in component
export const wsService = new WebSocketService(
  `${import.meta.env.VITE_WS_URL}/ws/v1/stream`
);
```

```typescript
// Server-Sent Events (SSE) Alternative
// lib/services/sse-service.ts

export class SSEService {
  private eventSource: EventSource | null = null;

  connect(url: string): void {
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };

    this.eventSource.addEventListener('metric', (event) => {
      const metric = JSON.parse(event.data);
      metrics.addMetric(metric);
    });

    this.eventSource.addEventListener('alert', (event) => {
      const alert = JSON.parse(event.data);
      notifications.addAlert(alert);
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.eventSource?.close();
      // Reconnect logic
    };
  }

  private handleEvent(data: any): void {
    // Handle generic events
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
```

### 3.5 Component Design Patterns

```svelte
<!-- lib/components/metrics/RealTimeMetrics.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { metrics } from '$lib/stores/metrics';
  import { wsService } from '$lib/services/websocket-service';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import MetricCard from './MetricCard.svelte';
  import type { MetricFilter } from '$lib/types/metric';

  export let filters: MetricFilter = {};

  let chartData: any[] = [];
  let isConnected = false;

  $: if ($metrics.metrics.length > 0) {
    updateChartData($metrics.metrics);
  }

  function updateChartData(metrics: any[]) {
    chartData = metrics.map(m => ({
      timestamp: m.timestamp,
      value: m.value,
    }));
  }

  onMount(() => {
    wsService.connect();
    wsService.subscribe('metrics.realtime');
    isConnected = true;
  });

  onDestroy(() => {
    wsService.unsubscribe('metrics.realtime');
    wsService.disconnect();
  });
</script>

<div class="real-time-metrics">
  <div class="status-indicator" class:connected={isConnected}>
    {isConnected ? 'Connected' : 'Disconnected'}
  </div>

  <div class="metrics-grid">
    {#each $metrics.metrics as metric (metric.id)}
      <MetricCard {metric} />
    {/each}
  </div>

  <div class="chart-container">
    <LineChart
      data={chartData}
      title="Real-Time Metrics"
      xKey="timestamp"
      yKey="value"
    />
  </div>
</div>

<style>
  .real-time-metrics {
    padding: 1rem;
  }

  .status-indicator {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: var(--color-danger);
    color: white;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .status-indicator.connected {
    background: var(--color-success);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .chart-container {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
</style>
```

---

## 4. Data Architecture

### 4.1 Database Schema

#### 4.1.1 PostgreSQL Schema (Primary Data)

```sql
-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);

-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles (Many-to-Many)
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Policies
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    definition JSONB NOT NULL,
    conditions JSONB,
    actions JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_to TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1,
    parent_policy_id UUID REFERENCES policies(id),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_policies_type ON policies(policy_type);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_category ON policies(category);
CREATE INDEX idx_policies_priority ON policies(priority DESC);
CREATE INDEX idx_policies_effective ON policies(effective_from, effective_to);

-- Policy Versions (History)
CREATE TABLE policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    definition JSONB NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_summary TEXT,
    UNIQUE(policy_id, version)
);

CREATE INDEX idx_policy_versions_policy ON policy_versions(policy_id);

-- Policy Violations
CREATE TABLE policy_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES policies(id),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    details JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    status VARCHAR(20) DEFAULT 'open'
);

CREATE INDEX idx_violations_policy ON policy_violations(policy_id);
CREATE INDEX idx_violations_resource ON policy_violations(resource_type, resource_id);
CREATE INDEX idx_violations_status ON policy_violations(status);
CREATE INDEX idx_violations_detected ON policy_violations(detected_at DESC);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    scopes JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_status ON api_keys(status);
```

#### 4.1.2 TimescaleDB Schema (Time-Series Data)

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Metrics (Hypertable)
CREATE TABLE metrics (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    tags JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Convert to hypertable (partitioned by time)
SELECT create_hypertable('metrics', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Create indexes
CREATE INDEX idx_metrics_name_time ON metrics(metric_name, timestamp DESC);
CREATE INDEX idx_metrics_resource ON metrics(resource_type, resource_id, timestamp DESC);
CREATE INDEX idx_metrics_tags ON metrics USING GIN(tags);

-- Continuous Aggregates (Materialized Views)
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS bucket,
    metric_name,
    metric_type,
    resource_type,
    resource_id,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    STDDEV(value) AS stddev_value,
    COUNT(*) AS sample_count
FROM metrics
GROUP BY bucket, metric_name, metric_type, resource_type, resource_id;

CREATE MATERIALIZED VIEW metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) AS bucket,
    metric_name,
    metric_type,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) AS median_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) AS p95_value,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) AS p99_value,
    COUNT(*) AS sample_count
FROM metrics
GROUP BY bucket, metric_name, metric_type;

-- Retention policies (auto-delete old data)
SELECT add_retention_policy('metrics', INTERVAL '90 days');
SELECT add_retention_policy('metrics_hourly', INTERVAL '1 year');

-- Compression policies (compress old data)
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'metric_name, resource_type, resource_id'
);

SELECT add_compression_policy('metrics', INTERVAL '7 days');
```

#### 4.1.3 Audit Log Schema

```sql
-- Audit Logs (Append-only)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(50) DEFAULT 'user',
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    session_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    before_state JSONB,
    after_state JSONB,
    metadata JSONB DEFAULT '{}'
);

-- Convert to hypertable for time-series efficiency
SELECT create_hypertable('audit_logs', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Indexes
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type, timestamp DESC);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, timestamp DESC);
CREATE INDEX idx_audit_details ON audit_logs USING GIN(details);

-- Retention policy (keep 7 years for compliance)
SELECT add_retention_policy('audit_logs', INTERVAL '7 years');

-- Compliance Events (Subset of audit logs for compliance reporting)
CREATE MATERIALIZED VIEW compliance_events AS
SELECT
    id,
    timestamp,
    event_type,
    actor_id,
    resource_type,
    resource_id,
    action,
    details
FROM audit_logs
WHERE event_category IN ('policy_change', 'access_control', 'data_access', 'configuration');

CREATE INDEX idx_compliance_events_timestamp ON compliance_events(timestamp DESC);
```

### 4.2 Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        Caching Layers                            │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Browser Cache
  - Static assets (CSS, JS, images)
  - Cache-Control headers
  - Service Worker for offline support

Layer 2: CDN Cache
  - Static content delivery
  - Edge caching for API responses (public data)
  - Geographic distribution

Layer 3: Application Cache (Redis)
  - Session data (TTL: session lifetime)
  - User profiles (TTL: 15 minutes)
  - Active policies (TTL: 5 minutes)
  - Role permissions (TTL: 10 minutes)
  - Metric aggregates (TTL: 1 minute)
  - API rate limiting counters

Layer 4: Query Cache (PostgreSQL)
  - Materialized views for complex queries
  - Query result caching

Layer 5: TimescaleDB Continuous Aggregates
  - Pre-computed metric rollups
  - Hourly/daily aggregates
```

**Redis Caching Implementation**:

```rust
use redis::{Client, Commands, AsyncCommands};
use serde::{Serialize, Deserialize};

pub struct RedisCache {
    client: Client,
}

impl RedisCache {
    pub fn new(url: &str) -> Result<Self> {
        let client = Client::open(url)?;
        Ok(Self { client })
    }

    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        let mut conn = self.client.get_async_connection().await?;
        let value: Option<String> = conn.get(key).await?;

        match value {
            Some(v) => {
                let data: T = serde_json::from_str(&v)?;
                Ok(Some(data))
            }
            None => Ok(None),
        }
    }

    pub async fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl_seconds: usize,
    ) -> Result<()> {
        let mut conn = self.client.get_async_connection().await?;
        let serialized = serde_json::to_string(value)?;
        conn.set_ex(key, serialized, ttl_seconds).await?;
        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<()> {
        let mut conn = self.client.get_async_connection().await?;
        conn.del(key).await?;
        Ok(())
    }

    pub async fn invalidate_pattern(&self, pattern: &str) -> Result<()> {
        let mut conn = self.client.get_async_connection().await?;
        let keys: Vec<String> = conn.keys(pattern).await?;
        if !keys.is_empty() {
            conn.del(keys).await?;
        }
        Ok(())
    }
}

// Cache-aside pattern
pub async fn get_policy_with_cache(
    policy_id: &Uuid,
    cache: &RedisCache,
    repo: &PolicyRepository,
) -> Result<Policy> {
    let cache_key = format!("policy:{}", policy_id);

    // Try cache first
    if let Some(policy) = cache.get(&cache_key).await? {
        return Ok(policy);
    }

    // Cache miss - fetch from database
    let policy = repo.find_by_id(policy_id).await?
        .ok_or_else(|| Error::NotFound)?;

    // Store in cache
    cache.set(&cache_key, &policy, 300).await?; // 5 minute TTL

    Ok(policy)
}
```

**Cache Invalidation Strategy**:

```rust
// Event-driven cache invalidation
pub struct CacheInvalidator {
    cache: Arc<RedisCache>,
    event_bus: EventBus,
}

impl CacheInvalidator {
    pub async fn start(&self) {
        self.event_bus.subscribe("policy.updated", |event| {
            let policy_id = event.resource_id;
            self.cache.delete(&format!("policy:{}", policy_id)).await?;
            self.cache.invalidate_pattern("policies:list:*").await?;
        });

        self.event_bus.subscribe("user.updated", |event| {
            let user_id = event.resource_id;
            self.cache.delete(&format!("user:{}", user_id)).await?;
            self.cache.delete(&format!("user:{}:permissions", user_id)).await?;
        });
    }
}
```

### 4.3 Data Flow Diagrams

#### 4.3.1 Policy Evaluation Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. POST /api/v1/policies/{id}/evaluate
     ▼
┌────────────────┐
│  API Gateway   │ 2. Authenticate & Authorize
└────┬───────────┘
     │
     ▼
┌────────────────┐
│ Policy Service │ 3. Fetch policy (cache/DB)
└────┬───────────┘
     │
     ├─────────────────────┐
     │                     │
     ▼                     ▼
┌──────────┐        ┌─────────────┐
│  Redis   │        │ PostgreSQL  │
│  Cache   │        │   Database  │
└──────────┘        └─────────────┘
     │
     │ 4. Evaluate policy rules
     ▼
┌────────────────┐
│ Rule Engine    │
└────┬───────────┘
     │
     │ 5. Check against current state
     ▼
┌────────────────┐
│ Metrics Service│
└────┬───────────┘
     │
     │ 6. Log evaluation
     ▼
┌────────────────┐
│ Audit Service  │
└────┬───────────┘
     │
     │ 7. Return result
     ▼
┌──────────┐
│  Client  │
└──────────┘
```

#### 4.3.2 Real-Time Metrics Flow

```
┌──────────────┐
│ LLM Platform │ (Metrics source)
└──────┬───────┘
       │ 1. Push metrics (gRPC stream)
       ▼
┌──────────────────┐
│ Integration Svc  │ 2. Transform & validate
└──────┬───────────┘
       │
       │ 3. Publish to message queue
       ▼
┌──────────────────┐
│  Kafka/NATS      │
└──────┬───────────┘
       │
       ├───────────────────┬─────────────────┐
       │                   │                 │
       ▼                   ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Metrics Svc   │  │Alert Engine  │  │ Analytics    │
│(Consumer 1)  │  │(Consumer 2)  │  │(Consumer 3)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       │ 4. Store        │ 5. Check         │ 6. Aggregate
       ▼                 │    thresholds    ▼
┌──────────────┐         │           ┌──────────────┐
│ TimescaleDB  │         │           │ Redis Cache  │
└──────────────┘         │           └──────────────┘
                         │
                         │ 6. Alert triggered
                         ▼
                  ┌──────────────┐
                  │  WebSocket   │ 7. Push to clients
                  │   Gateway    │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   Clients    │
                  └──────────────┘
```

---

## 5. Technology Stack

### 5.1 Backend Technologies

#### 5.1.1 Core Rust Crates

**Web Framework**:
```toml
[dependencies]
# Web framework - async, performant, batteries included
actix-web = "4.4"
actix-rt = "2.9"
actix-cors = "0.7"

# Async runtime
tokio = { version = "1.35", features = ["full"] }
tokio-stream = "0.1"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Database
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "postgres", "uuid", "chrono", "json"] }
deadpool-postgres = "0.12"

# Redis
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }
deadpool-redis = "0.14"

# gRPC
tonic = "0.10"
tonic-build = "0.10"
prost = "0.12"

# Authentication/Authorization
jsonwebtoken = "9.2"
bcrypt = "0.15"
argon2 = "0.5"

# Configuration
config = "0.13"
dotenv = "0.15"

# Logging & Tracing
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-actix-web = "0.7"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Validation
validator = { version = "0.16", features = ["derive"] }

# HTTP client
reqwest = { version = "0.11", features = ["json", "stream"] }

# UUID
uuid = { version = "1.6", features = ["v4", "serde"] }

# Date/Time
chrono = { version = "0.4", features = ["serde"] }

# Metrics & Monitoring
prometheus = "0.13"
metrics = "0.21"
metrics-exporter-prometheus = "0.13"

# Message Queue
rdkafka = "0.36"
# OR
async-nats = "0.33"

# WebSocket
actix-web-actors = "4.2"
tokio-tungstenite = "0.21"

# Rate Limiting
governor = "0.6"
```

**Justifications**:
- **actix-web**: High-performance, mature ecosystem, excellent async support
- **tokio**: Industry-standard async runtime, excellent ecosystem
- **sqlx**: Compile-time checked queries, async, supports PostgreSQL
- **tonic**: Production-ready gRPC implementation
- **jsonwebtoken**: Secure JWT handling for authentication
- **tracing**: Structured logging with correlation IDs

#### 5.1.2 Supporting Services

**Message Queue**: Kafka or NATS
- Kafka: Better for high-throughput, persistence, complex routing
- NATS: Simpler, lower latency, easier operations
- **Recommendation**: NATS for initial deployment, migrate to Kafka if needed

**Search**: Elasticsearch
- Full-text search for logs and audit trails
- Aggregations for analytics
- Scalable and battle-tested

**Object Storage**: S3-compatible (AWS S3, MinIO)
- Policy document storage
- Report exports
- Backup storage

### 5.2 Frontend Technologies

#### 5.2.1 Core TypeScript Stack

```json
{
  "dependencies": {
    // Framework
    "@sveltejs/kit": "^2.0.0",
    "svelte": "^4.2.0",

    // UI Components
    "@melt-ui/svelte": "^0.70.0",
    "@melt-ui/pp": "^0.3.0",

    // Charts & Visualization
    "d3": "^7.8.0",
    "chart.js": "^4.4.0",
    "chartjs-adapter-date-fns": "^3.0.0",
    "apexcharts": "^3.45.0",

    // Date/Time
    "date-fns": "^3.0.0",

    // API & Data Fetching
    "axios": "^1.6.0",
    "@tanstack/svelte-query": "^5.14.0",

    // Form Handling
    "zod": "^3.22.0",
    "sveltekit-superforms": "^2.0.0",

    // State Management
    "svelte/store": "built-in",

    // Icons
    "lucide-svelte": "^0.300.0",

    // Utilities
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    // TypeScript
    "typescript": "^5.3.0",
    "@tsconfig/svelte": "^5.0.0",

    // Build Tools
    "vite": "^5.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",

    // Styling
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",

    // Testing
    "vitest": "^1.0.0",
    "@testing-library/svelte": "^4.0.0",
    "playwright": "^1.40.0",

    // Linting & Formatting
    "eslint": "^8.56.0",
    "prettier": "^3.1.0",
    "prettier-plugin-svelte": "^3.1.0"
  }
}
```

**Justifications**:
- **SvelteKit**: Modern, performant, great DX, SSR support
- **Melt UI**: Headless UI components for accessibility
- **D3/Chart.js/ApexCharts**: Comprehensive charting options
- **TanStack Query**: Powerful data fetching and caching
- **Zod**: Runtime type validation for forms and API responses
- **Tailwind CSS**: Utility-first CSS for rapid development

#### 5.2.2 Visualization Libraries

**Primary**: D3.js
- Maximum flexibility for custom visualizations
- Real-time data updates
- Interactive dashboards

**Secondary**: ApexCharts
- Pre-built chart types
- Responsive and mobile-friendly
- Good TypeScript support

**Use Cases**:
- Time-series metrics: ApexCharts line/area charts
- Policy compliance: D3 custom visualizations
- Real-time monitoring: Custom D3 gauges and indicators
- Analytics reports: ApexCharts for standard charts

### 5.3 Infrastructure Technologies

```yaml
# Container Orchestration
Kubernetes: "1.28+"
  - Deployment management
  - Service discovery
  - Auto-scaling
  - Rolling updates

# Service Mesh
Istio: "1.20+"
  - Traffic management
  - Security (mTLS)
  - Observability
  - Circuit breaking

# Monitoring & Observability
Prometheus: "2.48+"
  - Metrics collection
  - Alerting
Grafana: "10.2+"
  - Visualization
  - Dashboards
Jaeger: "1.52+"
  - Distributed tracing
Loki: "2.9+"
  - Log aggregation

# CI/CD
GitHub Actions
  - Automated testing
  - Build pipelines
  - Deployment automation

# Infrastructure as Code
Terraform: "1.6+"
  - Cloud resource provisioning
  - State management
Helm: "3.13+"
  - Kubernetes package management
  - Release management
```

---

## 6. Deployment Architecture

### 6.1 Deployment Topology Options

#### 6.1.1 Option 1: Integrated Web UI within LLM DevOps Platform

```
┌─────────────────────────────────────────────────────────────────┐
│              LLM DevOps Platform (Existing)                      │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │   Model Mgmt   │  │   Training     │  │   Deployment   │   │
│  │   Service      │  │   Pipeline     │  │   Service      │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Governance Dashboard (Embedded)                   │  │
│  │                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ Dashboard UI │  │ Policy Svc   │  │ Metrics Svc  │  │  │
│  │  │ (Frontend)   │  │ (Backend)    │  │ (Backend)    │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  │                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐                     │  │
│  │  │  Audit Svc   │  │  Auth/User   │                     │  │
│  │  │  (Backend)   │  │  Service     │                     │  │
│  │  └──────────────┘  └──────────────┘                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Shared Resources:                                              │
│  - Authentication service                                       │
│  - User database                                                │
│  - Audit logging                                                │
└─────────────────────────────────────────────────────────────────┘

Advantages:
  ✓ Single sign-on
  ✓ Unified user experience
  ✓ Shared authentication/authorization
  ✓ Easier deployment
  ✓ Lower operational overhead

Disadvantages:
  ✗ Tighter coupling
  ✗ Deployment dependencies
  ✗ Potential version conflicts
```

#### 6.1.2 Option 2: Standalone Dashboard Service

```
┌─────────────────────────────────────────────────────────────────┐
│              LLM DevOps Platform                                 │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │   Model Mgmt   │  │   Training     │  │   Deployment   │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Integration
                              │ Event Streaming
                              │ gRPC/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Governance Dashboard (Standalone)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Dashboard UI │  │ Policy Svc   │  │ Metrics Svc  │         │
│  │ (Frontend)   │  │ (Backend)    │  │ (Backend)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Audit Svc   │  │  Integration │  │  Analytics   │         │
│  │  (Backend)   │  │  Service     │  │  Service     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  Own Infrastructure:                                            │
│  - Separate databases                                           │
│  - Independent auth service                                     │
│  - Dedicated monitoring                                         │
└─────────────────────────────────────────────────────────────────┘

Advantages:
  ✓ Loose coupling
  ✓ Independent scaling
  ✓ Independent deployment cycles
  ✓ Technology flexibility
  ✓ Multi-tenant support

Disadvantages:
  ✗ More operational complexity
  ✗ Separate authentication
  ✗ Increased infrastructure costs
  ✗ Integration overhead
```

#### 6.1.3 Option 3: Embeddable Component Library

```
┌─────────────────────────────────────────────────────────────────┐
│         Governance Component Library (NPM Package)               │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PolicyWidget │  │ MetricsChart │  │ AuditViewer  │         │
│  │ Component    │  │ Component    │  │ Component    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ ComplianceDash│ │ RealTimeMonitor│ │ AlertPanel  │         │
│  │ Component    │  │ Component    │  │ Component    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Embedded in
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Client Application (Any TypeScript App)                  │
│                                                                  │
│  import { PolicyWidget, MetricsChart } from '@llm/governance';  │
│                                                                  │
│  <PolicyWidget policyId="..." />                                │
│  <MetricsChart metricType="..." realtime={true} />              │
└─────────────────────────────────────────────────────────────────┘

Advantages:
  ✓ Maximum flexibility
  ✓ Easy integration
  ✓ Reusable components
  ✓ Framework-agnostic (with adapters)

Disadvantages:
  ✗ Limited functionality per component
  ✗ Styling integration challenges
  ✗ Version management complexity
```

### 6.2 Kubernetes Deployment

```yaml
# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: llm-governance

---
# Backend Deployment (Policy Service)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: policy-service
  namespace: llm-governance
spec:
  replicas: 3
  selector:
    matchLabels:
      app: policy-service
  template:
    metadata:
      labels:
        app: policy-service
        version: v1
    spec:
      containers:
      - name: policy-service
        image: llm-governance/policy-service:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: grpc
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
# Service
apiVersion: v1
kind: Service
metadata:
  name: policy-service
  namespace: llm-governance
spec:
  selector:
    app: policy-service
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: grpc
    port: 9090
    targetPort: 9090
  type: ClusterIP

---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: policy-service-hpa
  namespace: llm-governance
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: policy-service
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

---
# Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard-ui
  namespace: llm-governance
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dashboard-ui
  template:
    metadata:
      labels:
        app: dashboard-ui
    spec:
      containers:
      - name: dashboard-ui
        image: llm-governance/dashboard-ui:latest
        ports:
        - containerPort: 3000
        env:
        - name: API_BASE_URL
          value: "http://api-gateway"
        resources:
          requests:
            memory: "128Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "200m"

---
# Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: governance-dashboard
  namespace: llm-governance
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - governance.example.com
    secretName: governance-tls
  rules:
  - host: governance.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dashboard-ui
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

### 6.3 Scalability Considerations

#### 6.3.1 Horizontal Scaling

```
Component          | Min Replicas | Max Replicas | Scaling Metric
-------------------|--------------|--------------|------------------
API Gateway        | 2            | 10           | CPU (70%)
Policy Service     | 3            | 10           | CPU (70%)
Metrics Service    | 3            | 20           | Request Rate
Audit Service      | 2            | 5            | Memory (80%)
Analytics Service  | 2            | 8            | CPU (75%)
Dashboard UI       | 2            | 5            | CPU (60%)
```

#### 6.3.2 Database Scaling

**PostgreSQL**:
- Primary-Replica setup for read scaling
- Connection pooling (PgBouncer)
- Partitioning for large tables
- Read replicas for analytics queries

**TimescaleDB**:
- Automatic chunking for time-series data
- Compression for old data
- Continuous aggregates for performance
- Multi-node setup for large-scale deployments

**Redis**:
- Redis Cluster for horizontal scaling
- Separate clusters for different use cases:
  - Cache cluster
  - Session cluster
  - Rate limiting cluster

#### 6.3.3 Performance Targets

```
Metric                          | Target
--------------------------------|------------------
API Response Time (p95)         | < 200ms
API Response Time (p99)         | < 500ms
Dashboard Page Load             | < 2s
Real-time Metric Update Latency | < 100ms
Concurrent Users                | 10,000+
Metrics Ingestion Rate          | 100,000 points/sec
API Request Rate                | 50,000 req/sec
Database Query Time (p95)       | < 50ms
Cache Hit Rate                  | > 90%
```

---

## 7. Security Architecture

### 7.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      Edge Security                               │
│  - WAF (Web Application Firewall)                               │
│  - DDoS Protection                                              │
│  - Rate Limiting                                                │
│  - TLS/SSL Termination                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  Network Security                                │
│  - Network Policies (Kubernetes)                                │
│  - Service Mesh (mTLS)                                          │
│  - VPC/Private Subnets                                          │
│  - Security Groups                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                Application Security                              │
│  - Authentication (OAuth2, JWT, SSO)                            │
│  - Authorization (RBAC, ABAC)                                   │
│  - Input Validation                                             │
│  - Output Encoding                                              │
│  - CSRF Protection                                              │
│  - XSS Prevention                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   Data Security                                  │
│  - Encryption at Rest (Database, Object Storage)                │
│  - Encryption in Transit (TLS)                                  │
│  - Secrets Management (Vault, K8s Secrets)                      │
│  - Data Masking                                                 │
│  - Audit Logging                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Authentication & Authorization

#### 7.2.1 Authentication Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. POST /api/v1/auth/login
     │    { email, password }
     ▼
┌────────────────┐
│  Auth Service  │ 2. Validate credentials
└────┬───────────┘
     │
     │ 3. Query user
     ▼
┌────────────────┐
│   PostgreSQL   │
└────┬───────────┘
     │
     │ 4. User found
     ▼
┌────────────────┐
│  Auth Service  │ 5. Generate JWT tokens
└────┬───────────┘    - Access token (short-lived: 15min)
     │                - Refresh token (long-lived: 7days)
     │
     │ 6. Store session
     ▼
┌────────────────┐
│     Redis      │
└────┬───────────┘
     │
     │ 7. Return tokens
     ▼
┌──────────┐
│  Client  │ 8. Store tokens (HttpOnly cookie or localStorage)
└──────────┘
```

**JWT Token Structure**:

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-id-123"
  },
  "payload": {
    "sub": "user-uuid-123",
    "email": "user@example.com",
    "roles": ["admin", "viewer"],
    "permissions": [
      "policies:read",
      "policies:write",
      "metrics:read",
      "users:read"
    ],
    "tenant_id": "tenant-uuid-456",
    "iat": 1699564800,
    "exp": 1699565700,
    "jti": "token-id-789"
  }
}
```

#### 7.2.2 Authorization Model (RBAC)

```
Predefined Roles:

┌─────────────────────────────────────────────────────────────────┐
│ Super Admin                                                      │
│  - Full system access                                           │
│  - User management                                              │
│  - System configuration                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Admin                                                            │
│  - Policy management (CRUD)                                     │
│  - User management (read, create, update)                       │
│  - Metrics read                                                 │
│  - Audit logs read                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Policy Manager                                                   │
│  - Policy management (CRUD)                                     │
│  - Policy evaluation                                            │
│  - Violation management                                         │
│  - Metrics read                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Auditor                                                          │
│  - Audit logs read                                              │
│  - Compliance reports read                                      │
│  - Policy read                                                  │
│  - Metrics read                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Viewer                                                           │
│  - Dashboard view                                               │
│  - Metrics read                                                 │
│  - Policy read (limited)                                        │
└─────────────────────────────────────────────────────────────────┘

Permission Format: {resource}:{action}

Resources:
  - policies
  - metrics
  - audit
  - users
  - roles
  - settings

Actions:
  - create
  - read
  - update
  - delete
  - execute (for policy evaluation)
```

### 7.3 Data Encryption

#### 7.3.1 Encryption at Rest

```
PostgreSQL:
  - Transparent Data Encryption (TDE)
  - Encrypted tablespaces
  - Encrypted backups

TimescaleDB:
  - Same as PostgreSQL (extension)

Redis:
  - Disk encryption (OS-level)
  - Encrypted RDB/AOF files

Object Storage (S3):
  - Server-side encryption (SSE-S3 or SSE-KMS)
  - Client-side encryption for sensitive data

Secrets:
  - HashiCorp Vault
  - Kubernetes Secrets (encrypted with KMS)
  - Never store secrets in code or config files
```

#### 7.3.2 Encryption in Transit

```
All Communication:
  - TLS 1.3 minimum
  - Strong cipher suites only
  - Certificate-based authentication

Service-to-Service:
  - Mutual TLS (mTLS) via service mesh
  - Certificate rotation
  - Service identity verification

Client-to-Server:
  - HTTPS only
  - HSTS headers
  - Certificate pinning (mobile apps)
```

### 7.4 Security Best Practices

```rust
// Input Validation
use validator::Validate;

#[derive(Debug, Validate, Deserialize)]
pub struct CreatePolicyRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,

    #[validate(length(max = 2000))]
    pub description: Option<String>,

    #[validate(custom = "validate_policy_definition")]
    pub definition: serde_json::Value,
}

fn validate_policy_definition(definition: &serde_json::Value) -> Result<(), ValidationError> {
    // Validate policy structure
    // Prevent code injection
    // Check for malicious patterns
}

// SQL Injection Prevention (using sqlx)
pub async fn get_policy_by_name(
    pool: &PgPool,
    name: &str,
) -> Result<Option<Policy>> {
    // Parameterized query - safe from SQL injection
    sqlx::query_as!(
        Policy,
        "SELECT * FROM policies WHERE name = $1",
        name
    )
    .fetch_optional(pool)
    .await
}

// XSS Prevention
use actix_web::http::header;

pub fn security_headers() -> actix_web::middleware::DefaultHeaders {
    actix_web::middleware::DefaultHeaders::new()
        .add((header::X_CONTENT_TYPE_OPTIONS, "nosniff"))
        .add((header::X_FRAME_OPTIONS, "DENY"))
        .add((header::X_XSS_PROTECTION, "1; mode=block"))
        .add((
            header::CONTENT_SECURITY_POLICY,
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
        ))
        .add((
            header::STRICT_TRANSPORT_SECURITY,
            "max-age=31536000; includeSubDomains",
        ))
}

// Rate Limiting
use governor::{Quota, RateLimiter};

pub struct RateLimitMiddleware {
    limiter: RateLimiter<String, governor::state::InMemoryState, governor::clock::DefaultClock>,
}

impl RateLimitMiddleware {
    pub fn new(requests_per_second: u32) -> Self {
        let quota = Quota::per_second(NonZeroU32::new(requests_per_second).unwrap());
        let limiter = RateLimiter::direct(quota);
        Self { limiter }
    }
}

// Audit Logging for Security Events
pub async fn log_security_event(
    event_type: SecurityEventType,
    user_id: Option<Uuid>,
    details: serde_json::Value,
) {
    audit_service.log_event(AuditEvent {
        event_type: format!("security.{}", event_type),
        category: "security",
        actor_id: user_id,
        action: event_type.to_string(),
        status: "success",
        details,
        ..Default::default()
    }).await;
}

enum SecurityEventType {
    LoginSuccess,
    LoginFailure,
    PasswordChange,
    PermissionDenied,
    SuspiciousActivity,
    DataAccess,
}
```

---

## 8. Integration Patterns

### 8.1 LLM DevOps Platform Integration

```
Integration Methods:

1. REST API Integration
   - HTTP/JSON for CRUD operations
   - Standard REST endpoints
   - Async callbacks via webhooks

2. gRPC Integration
   - High-performance binary protocol
   - Bi-directional streaming
   - Strong typing with Protocol Buffers

3. Event Streaming
   - Real-time event processing
   - Kafka/NATS message bus
   - Event-driven architecture

4. WebHooks
   - Push notifications
   - Event subscriptions
   - Retry logic with exponential backoff
```

### 8.2 Integration Patterns

```rust
// 1. Adapter Pattern for External Systems
pub trait ExternalSystemAdapter {
    async fn fetch_model_info(&self, model_id: &str) -> Result<ModelInfo>;
    async fn fetch_metrics(&self, query: &MetricsQuery) -> Result<Vec<Metric>>;
    async fn register_policy(&self, policy: &Policy) -> Result<String>;
}

pub struct LLMDevOpsAdapter {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl ExternalSystemAdapter for LLMDevOpsAdapter {
    async fn fetch_model_info(&self, model_id: &str) -> Result<ModelInfo> {
        let response = self.client
            .get(&format!("{}/api/models/{}", self.base_url, model_id))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        let model_info = response.json::<ModelInfo>().await?;
        Ok(model_info)
    }
}

// 2. Event Listener Pattern
pub struct EventListener {
    subscribers: HashMap<String, Vec<Box<dyn EventHandler>>>,
}

impl EventListener {
    pub fn subscribe(&mut self, event_type: String, handler: Box<dyn EventHandler>) {
        self.subscribers
            .entry(event_type)
            .or_insert_with(Vec::new)
            .push(handler);
    }

    pub async fn dispatch(&self, event: Event) -> Result<()> {
        if let Some(handlers) = self.subscribers.get(&event.event_type) {
            for handler in handlers {
                handler.handle(&event).await?;
            }
        }
        Ok(())
    }
}

// 3. Circuit Breaker Pattern
use tokio::sync::RwLock;

pub struct CircuitBreaker {
    state: Arc<RwLock<CircuitState>>,
    failure_threshold: u32,
    success_threshold: u32,
    timeout: Duration,
}

enum CircuitState {
    Closed,
    Open { until: Instant },
    HalfOpen,
}

impl CircuitBreaker {
    pub async fn call<F, T>(&self, f: F) -> Result<T>
    where
        F: Future<Output = Result<T>>,
    {
        let state = self.state.read().await;
        match *state {
            CircuitState::Open { until } if Instant::now() < until => {
                return Err(Error::CircuitBreakerOpen);
            }
            _ => {}
        }
        drop(state);

        match f.await {
            Ok(result) => {
                self.record_success().await;
                Ok(result)
            }
            Err(e) => {
                self.record_failure().await;
                Err(e)
            }
        }
    }
}

// 4. Retry with Exponential Backoff
pub async fn retry_with_backoff<F, T>(
    mut f: F,
    max_retries: u32,
    initial_delay: Duration,
) -> Result<T>
where
    F: FnMut() -> BoxFuture<'static, Result<T>>,
{
    let mut delay = initial_delay;
    let mut retries = 0;

    loop {
        match f().await {
            Ok(result) => return Ok(result),
            Err(e) if retries < max_retries => {
                retries += 1;
                tokio::time::sleep(delay).await;
                delay *= 2; // Exponential backoff
            }
            Err(e) => return Err(e),
        }
    }
}
```

### 8.3 API Design Patterns

```
Pattern 1: Pagination
  GET /api/v1/policies?page=1&limit=20
  Response includes: items, total, page, limit, has_more

Pattern 2: Filtering
  GET /api/v1/policies?status=active&category=security
  Support multiple filters, AND/OR logic

Pattern 3: Sorting
  GET /api/v1/policies?sort=created_at:desc,priority:asc
  Default sorting for consistent results

Pattern 4: Field Selection
  GET /api/v1/policies?fields=id,name,status
  Reduce payload size, improve performance

Pattern 5: Versioning
  URL: /api/v1/...
  Header: Accept: application/vnd.llm-governance.v1+json
  Deprecation warnings in headers

Pattern 6: Error Handling
  Consistent error format:
  {
    "error": {
      "code": "POLICY_NOT_FOUND",
      "message": "Policy with ID xyz not found",
      "details": {},
      "request_id": "req-123"
    }
  }

Pattern 7: Idempotency
  POST/PUT/DELETE with Idempotency-Key header
  Prevent duplicate operations

Pattern 8: Bulk Operations
  POST /api/v1/policies/bulk
  {
    "operations": [
      { "op": "create", "data": {...} },
      { "op": "update", "id": "...", "data": {...} }
    ]
  }
```

---

## Summary

This architecture document provides a comprehensive blueprint for the LLM-Governance-Dashboard:

1. **System Architecture**: Microservices-based with clear separation of concerns, supporting multiple deployment models

2. **Backend**: Rust-based services using actix-web, tokio, sqlx, with REST, gRPC, and WebSocket APIs

3. **Frontend**: SvelteKit-based TypeScript application with reactive state management and real-time data streaming

4. **Data**: Multi-database architecture (PostgreSQL, TimescaleDB, Redis, Elasticsearch) with comprehensive caching

5. **Technology Stack**: Modern, performant technologies chosen for scalability and developer experience

6. **Deployment**: Flexible deployment options (integrated, standalone, embeddable) with Kubernetes orchestration

7. **Security**: Multi-layered security with authentication, authorization, encryption, and comprehensive audit logging

8. **Integration**: Well-defined patterns for integrating with LLM DevOps platforms and external systems

The architecture is designed to be:
- **Scalable**: Horizontal scaling for all components
- **Resilient**: Circuit breakers, retries, health checks
- **Observable**: Comprehensive metrics, logging, tracing
- **Secure**: Multiple security layers, defense in depth
- **Maintainable**: Clear separation of concerns, well-documented
- **Performant**: Sub-200ms API responses, real-time updates

This architecture serves as the foundation for the implementation phase, providing clear guidance for development teams while maintaining flexibility for future enhancements.
