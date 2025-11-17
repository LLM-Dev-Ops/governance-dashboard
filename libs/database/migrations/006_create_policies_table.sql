-- Migration: 006_create_policies_table.sql
-- Description: Create policies table for governance rules
-- Created: 2025-11-16

-- Policies table
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('cost', 'security', 'compliance', 'usage', 'rate_limit', 'content_filter')),
    rules JSONB NOT NULL DEFAULT '{}',
    enforcement_level VARCHAR(50) NOT NULL DEFAULT 'warning' CHECK (enforcement_level IN ('strict', 'warning', 'monitor')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for policies table
CREATE INDEX idx_policies_name ON policies(name);
CREATE INDEX idx_policies_policy_type ON policies(policy_type);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_enforcement_level ON policies(enforcement_level);
CREATE INDEX idx_policies_rules ON policies USING GIN(rules);
CREATE INDEX idx_policies_created_by ON policies(created_by);

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE policies IS 'Governance policies and rules';
COMMENT ON COLUMN policies.policy_type IS 'Type of policy: cost, security, compliance, usage, rate_limit, content_filter';
COMMENT ON COLUMN policies.rules IS 'JSONB policy rules definition';
COMMENT ON COLUMN policies.enforcement_level IS 'Enforcement level: strict, warning, monitor';
COMMENT ON COLUMN policies.status IS 'Policy status: active, inactive, draft';
COMMENT ON COLUMN policies.version IS 'Policy version number';

-- Policy assignments table (to teams or users)
CREATE TABLE policy_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT assignment_target CHECK (
        (team_id IS NOT NULL AND user_id IS NULL) OR
        (team_id IS NULL AND user_id IS NOT NULL)
    )
);

-- Indexes for policy_assignments table
CREATE INDEX idx_policy_assignments_policy_id ON policy_assignments(policy_id);
CREATE INDEX idx_policy_assignments_team_id ON policy_assignments(team_id);
CREATE INDEX idx_policy_assignments_user_id ON policy_assignments(user_id);
CREATE INDEX idx_policy_assignments_assigned_by ON policy_assignments(assigned_by);

COMMENT ON TABLE policy_assignments IS 'Policy assignments to teams or users';
COMMENT ON CONSTRAINT assignment_target ON policy_assignments IS 'Policy must be assigned to either a team or a user, not both';
