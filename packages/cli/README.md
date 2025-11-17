# @llm-dev-ops/llm-governance-cli

Command-line interface for the LLM Governance Dashboard. Manage your LLM providers, models, organizations, and teams from the terminal.

## Installation

```bash
npm install -g @llm-dev-ops/llm-governance-cli
```

## Quick Start

```bash
# Login
llm-gov auth login

# List organizations
llm-gov org list

# Create a provider
llm-gov provider create <org-id>

# View help
llm-gov --help
```

## Commands

### Authentication

#### `llm-gov auth login`
Login to the LLM Governance Dashboard interactively.

```bash
llm-gov auth login
```

Options:
- `--json` - Output in JSON format

#### `llm-gov auth logout`
Logout and clear stored credentials.

```bash
llm-gov auth logout
```

#### `llm-gov auth whoami`
Display current user information.

```bash
llm-gov auth whoami
llm-gov auth whoami --json
```

### Organizations

#### `llm-gov org list`
List all organizations.

```bash
llm-gov org list
llm-gov org list --json
```

#### `llm-gov org show <id>`
Show organization details.

```bash
llm-gov org show org-123
```

#### `llm-gov org create`
Create a new organization interactively.

```bash
llm-gov org create
```

#### `llm-gov org update <id>`
Update an organization.

```bash
llm-gov org update org-123 --name "New Name" --description "New description"
```

#### `llm-gov org delete <id>`
Delete an organization.

```bash
llm-gov org delete org-123
llm-gov org delete org-123 --force  # Skip confirmation
```

### Organization Members

#### `llm-gov org members list <org-id>`
List organization members.

```bash
llm-gov org members list org-123
```

#### `llm-gov org members add <org-id>`
Add a member to an organization.

```bash
llm-gov org members add org-123
```

#### `llm-gov org members remove <org-id> <member-id>`
Remove a member from an organization.

```bash
llm-gov org members remove org-123 member-456
```

### Teams

#### `llm-gov team list <org-id>`
List teams in an organization.

```bash
llm-gov team list org-123
```

#### `llm-gov team show <id>`
Show team details.

```bash
llm-gov team show team-456
```

#### `llm-gov team create <org-id>`
Create a new team.

```bash
llm-gov team create org-123
```

#### `llm-gov team update <id>`
Update a team.

```bash
llm-gov team update team-456 --name "New Team Name"
```

#### `llm-gov team delete <id>`
Delete a team.

```bash
llm-gov team delete team-456
```

### Team Members

#### `llm-gov team members list <team-id>`
List team members.

```bash
llm-gov team members list team-456
```

#### `llm-gov team members add <team-id>`
Add a member to a team.

```bash
llm-gov team members add team-456
```

#### `llm-gov team members remove <team-id> <member-id>`
Remove a member from a team.

```bash
llm-gov team members remove team-456 member-789
```

### LLM Providers

#### `llm-gov provider list <org-id>`
List LLM providers in an organization.

```bash
llm-gov provider list org-123
```

#### `llm-gov provider show <id>`
Show provider details.

```bash
llm-gov provider show provider-789
```

#### `llm-gov provider create <org-id>`
Create a new LLM provider.

```bash
llm-gov provider create org-123
```

Supported provider types:
- `openai`
- `anthropic`
- `azure`
- `bedrock`
- `custom`

#### `llm-gov provider update <id>`
Update a provider.

```bash
llm-gov provider update provider-789 --name "New Name"
llm-gov provider update provider-789 --api-key "new-key"
llm-gov provider update provider-789 --active false
```

#### `llm-gov provider delete <id>`
Delete a provider.

```bash
llm-gov provider delete provider-789
```

### LLM Models

#### `llm-gov model list <provider-id>`
List models for a provider.

```bash
llm-gov model list provider-789
```

#### `llm-gov model show <id>`
Show model details.

```bash
llm-gov model show model-101
```

#### `llm-gov model create <provider-id>`
Create a new model.

```bash
llm-gov model create provider-789
```

#### `llm-gov model update <id>`
Update a model.

```bash
llm-gov model update model-101 --name "GPT-4 Turbo"
llm-gov model update model-101 --enabled false
```

#### `llm-gov model delete <id>`
Delete a model.

```bash
llm-gov model delete model-101
```

### Configuration

#### `llm-gov config get <key>`
Get a configuration value.

```bash
llm-gov config get apiUrl
```

#### `llm-gov config set <key> <value>`
Set a configuration value.

```bash
llm-gov config set apiUrl https://api.example.com/v1
llm-gov config set defaultOrgId org-123
```

Valid configuration keys:
- `apiUrl` - API base URL
- `defaultOrgId` - Default organization ID

#### `llm-gov config list`
List all configuration values.

```bash
llm-gov config list
```

#### `llm-gov config clear`
Clear all configuration.

```bash
llm-gov config clear
```

## Global Options

Most commands support these global options:

- `--json` - Output in JSON format (useful for scripting)
- `--force` - Skip confirmation prompts (for delete operations)

## Configuration Storage

The CLI stores configuration in `~/.config/llm-governance/config.json`, including:
- API URL
- Authentication token
- Default organization ID

## Examples

### Complete Workflow Example

```bash
# 1. Login
llm-gov auth login

# 2. Create an organization
llm-gov org create

# 3. Add a provider (e.g., OpenAI)
llm-gov provider create org-123

# 4. Create a model
llm-gov model create provider-456

# 5. Create a team
llm-gov team create org-123

# 6. Add team members
llm-gov team members add team-789
```

### Scripting Example

```bash
#!/bin/bash

# Get all organizations in JSON format
ORGS=$(llm-gov org list --json)

# Parse with jq and iterate
echo "$ORGS" | jq -r '.[].id' | while read org_id; do
  echo "Listing providers for organization: $org_id"
  llm-gov provider list "$org_id"
done
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Create LLM Provider
  run: |
    echo "${{ secrets.LLM_GOV_PASSWORD }}" | llm-gov auth login --email admin@example.com
    llm-gov provider create $ORG_ID \
      --name "OpenAI Production" \
      --type openai \
      --api-key "${{ secrets.OPENAI_API_KEY }}" \
      --json
```

## Troubleshooting

### Authentication Issues

If you encounter authentication errors:

```bash
# Clear configuration and re-login
llm-gov config clear
llm-gov auth login
```

### API URL Configuration

To use a different API endpoint:

```bash
llm-gov config set apiUrl https://your-api-url.com/api/v1
```

### View Current Configuration

```bash
llm-gov config list
```

## Development

### Building from Source

```bash
git clone https://github.com/globalbusinessadvisors/llm-governance-dashboard.git
cd llm-governance-dashboard/packages/cli
npm install
npm run build
npm link
```

## License

Apache-2.0
