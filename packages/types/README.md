# @llm-dev-ops/types

TypeScript type definitions for the LLM Governance Dashboard API.

## Installation

```bash
npm install @llm-dev-ops/types
```

## Usage

```typescript
import type {
  User,
  Organization,
  Team,
  Policy,
  LLMUsage,
  AuditLog
} from '@llm-dev-ops/types';

// Use the types in your code
const user: User = {
  id: '123',
  email: 'user@example.com',
  full_name: 'John Doe',
  is_active: true,
  is_superuser: false,
  mfa_enabled: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};
```

## Available Types

### Authentication & Users

- `User` - User account information
- `AuthResponse` - Authentication response with token
- `LoginCredentials` - Login request credentials
- `RegisterData` - User registration data
- `MFASetupResponse` - MFA setup information
- `MFAVerifyRequest` - MFA verification request

### Organizations & Teams

- `Organization` - Organization entity
- `OrganizationMember` - Organization membership
- `Team` - Team entity
- `TeamMember` - Team membership

### Policies & Compliance

- `Policy` - Governance policy definition
- `PolicyRule` - Individual policy rule
- `PolicyViolation` - Policy violation record
- `PolicyTarget` - Policy application target
- `PolicyAction` - Policy enforcement action
- `PolicyStatus` - Policy status enumeration
- `RuleCondition` - Rule condition enumeration
- `ViolationSeverity` - Violation severity levels

### LLM Usage & Tracking

- `LLMUsage` - LLM API usage record
- `UsageStats` - Usage statistics aggregation
- `ModelStats` - Per-model usage statistics
- `LLMRequest` - LLM API request details

### Providers & Models

- `LLMProvider` - LLM provider configuration
- `LLMModel` - LLM model definition
- `ModelCapability` - Model capability enumeration

### Cost Management

- `CostBreakdown` - Cost breakdown by dimension
- `Budget` - Budget definition and tracking
- `Quota` - Usage quota definition
- `BudgetPeriod` - Budget period enumeration
- `QuotaPeriod` - Quota period enumeration

### Auditing

- `AuditLog` - Audit log entry
- `AuditAction` - Audit action enumeration
- `AuditStatus` - Audit status enumeration

### Dashboard & Metrics

- `DashboardMetrics` - Dashboard overview metrics
- `TopModel` - Top model usage statistics
- `BudgetAlert` - Budget alert information

### API Responses

- `ApiResponse<T>` - Standard API response wrapper
- `PaginatedResponse<T>` - Paginated API response
- `ApiError` - API error response

## Type Examples

### User Type

```typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
  organization_id?: string;
  role?: string;
}
```

### Policy Type

```typescript
interface Policy {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  rules: PolicyRule[];
  target: PolicyTarget;
  action: PolicyAction;
  status: PolicyStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

### LLM Usage Type

```typescript
interface LLMUsage {
  id: string;
  user_id: string;
  organization_id: string;
  team_id?: string;
  model_id: string;
  provider_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  request_timestamp: string;
  response_timestamp: string;
  status: string;
  metadata?: Record<string, any>;
}
```

### Organization Type

```typescript
interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  settings?: Record<string, any>;
}
```

## Enumerations

### PolicyStatus

```typescript
enum PolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}
```

### PolicyTarget

```typescript
enum PolicyTarget {
  USER = 'user',
  TEAM = 'team',
  ORGANIZATION = 'organization',
  MODEL = 'model'
}
```

### AuditAction

```typescript
enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS = 'access'
}
```

## Usage with SDK

This package is automatically included when you install `@llm-dev-ops/llm-governance`:

```typescript
import { LLMGovernanceSDK } from '@llm-dev-ops/llm-governance';
import type { User, Organization } from '@llm-dev-ops/types';

const sdk = new LLMGovernanceSDK();

// Types are automatically applied to SDK responses
const user: User = await sdk.auth.getCurrentUser();
const orgs: Organization[] = await sdk.organizations.listOrganizations();
```

## License

Apache-2.0
