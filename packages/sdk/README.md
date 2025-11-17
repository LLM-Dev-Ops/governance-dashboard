# @llm-dev-ops/sdk

TypeScript/JavaScript SDK for the LLM Governance Dashboard API.

## Installation

```bash
npm install @llm-dev-ops/sdk
```

## Usage

### Basic Setup

```typescript
import { LLMGovernanceSDK } from '@llm-dev-ops/sdk';

const sdk = new LLMGovernanceSDK({
  baseUrl: 'https://api.example.com/v1',
  token: 'your-access-token'
});
```

### Authentication

```typescript
// Login
const authResponse = await sdk.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const user = await sdk.auth.getCurrentUser();

// Register new user
const newUser = await sdk.auth.register({
  email: 'newuser@example.com',
  password: 'password123',
  full_name: 'John Doe'
});

// Logout
await sdk.auth.logout();

// MFA Setup
const mfaSetup = await sdk.auth.setupMFA();
const verification = await sdk.auth.verifyMFASetup('123456');
```

### Organizations

```typescript
// List organizations
const orgs = await sdk.organizations.listOrganizations();

// Get organization
const org = await sdk.organizations.getOrganization('org-id');

// Create organization
const newOrg = await sdk.organizations.createOrganization({
  name: 'My Organization',
  description: 'Organization description'
});

// Update organization
const updatedOrg = await sdk.organizations.updateOrganization('org-id', {
  name: 'Updated Name'
});

// Delete organization
await sdk.organizations.deleteOrganization('org-id');
```

### Organization Members

```typescript
// List members
const members = await sdk.organizations.listOrganizationMembers('org-id');

// Add member
const member = await sdk.organizations.addOrganizationMember(
  'org-id',
  'user-id',
  'admin'
);

// Update member role
const updatedMember = await sdk.organizations.updateOrganizationMember(
  'org-id',
  'member-id',
  'viewer'
);

// Remove member
await sdk.organizations.removeOrganizationMember('org-id', 'member-id');
```

### Teams

```typescript
// List teams
const teams = await sdk.organizations.listTeams('org-id');

// Get team
const team = await sdk.organizations.getTeam('team-id');

// Create team
const newTeam = await sdk.organizations.createTeam('org-id', {
  name: 'Engineering Team',
  description: 'Development team'
});

// Update team
const updatedTeam = await sdk.organizations.updateTeam('team-id', {
  name: 'Updated Team Name'
});

// Delete team
await sdk.organizations.deleteTeam('team-id');

// Manage team members
const teamMembers = await sdk.organizations.listTeamMembers('team-id');
await sdk.organizations.addTeamMember('team-id', 'user-id', 'member');
await sdk.organizations.removeTeamMember('team-id', 'member-id');
```

### LLM Providers and Models

```typescript
// List providers
const providers = await sdk.organizations.listProviders('org-id');

// Get provider
const provider = await sdk.organizations.getProvider('provider-id');

// Create provider
const newProvider = await sdk.organizations.createProvider('org-id', {
  name: 'OpenAI',
  provider_type: 'openai',
  api_key: 'sk-...'
});

// Update provider
const updatedProvider = await sdk.organizations.updateProvider('provider-id', {
  api_key: 'new-key'
});

// Delete provider
await sdk.organizations.deleteProvider('provider-id');

// Manage models
const models = await sdk.organizations.listModels('provider-id');
const model = await sdk.organizations.getModel('model-id');
const newModel = await sdk.organizations.createModel('provider-id', {
  name: 'gpt-4',
  description: 'GPT-4 model'
});
await sdk.organizations.updateModel('model-id', { is_enabled: false });
await sdk.organizations.deleteModel('model-id');
```

### Token Management

```typescript
// Set token dynamically
sdk.setToken('new-access-token');

// Get current token
const token = sdk.getToken();

// Set base URL
sdk.setBaseUrl('https://new-api.example.com/v1');

// Get current base URL
const baseUrl = sdk.getBaseUrl();
```

### Token Change Callback

```typescript
// Listen for token changes (useful for storing tokens)
const sdk = new LLMGovernanceSDK({
  baseUrl: 'https://api.example.com/v1',
  onTokenChange: (token) => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
});
```

### Error Handling

```typescript
import type { ApiError } from '@llm-dev-ops/sdk';

try {
  const user = await sdk.auth.getCurrentUser();
} catch (error) {
  const apiError = error as ApiError;
  console.error(`Error ${apiError.status_code}: ${apiError.detail}`);
  if (apiError.error_code) {
    console.error(`Error code: ${apiError.error_code}`);
  }
}
```

## API Reference

### LLMGovernanceSDK

Main SDK class that provides access to all API endpoints.

#### Constructor

```typescript
constructor(config?: ApiClientConfig)
```

**Parameters:**
- `config.baseUrl` - Base URL of the API (default: `http://localhost:8000/api/v1`)
- `config.token` - Initial authentication token
- `config.onTokenChange` - Callback function called when token changes

#### Properties

- `client: ApiClient` - Low-level HTTP client
- `auth: AuthApi` - Authentication API
- `organizations: OrganizationsApi` - Organizations API

#### Methods

- `setToken(token: string | null): void` - Set authentication token
- `getToken(): string | null` - Get current token
- `setBaseUrl(baseUrl: string): void` - Set API base URL
- `getBaseUrl(): string` - Get current base URL

## TypeScript Support

This package includes TypeScript type definitions. Import types from `@llm-dev-ops/types`:

```typescript
import type {
  User,
  Organization,
  Team,
  LLMProvider,
  LLMModel
} from '@llm-dev-ops/types';
```

## License

Apache-2.0
