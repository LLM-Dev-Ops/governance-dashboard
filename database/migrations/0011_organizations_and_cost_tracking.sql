-- ============================================================================
-- Organizations, Multi-Tenancy, and Cost Tracking Migration
-- ============================================================================
-- For open source LLM DevOps platform - self-hosted multi-tenant deployments
-- ============================================================================

-- Organizations (workspaces/tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- Organization members
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- Teams within organizations
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

CREATE INDEX idx_teams_org ON teams(organization_id);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- LLM Providers configuration
CREATE TABLE IF NOT EXISTS llm_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_name VARCHAR(100) NOT NULL CHECK (provider_name IN (
        'openai', 'anthropic', 'azure_openai', 'cohere', 'huggingface', 'custom'
    )),
    display_name VARCHAR(255) NOT NULL,
    api_key_encrypted TEXT,
    endpoint_url TEXT,
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, provider_name)
);

CREATE INDEX idx_llm_providers_org ON llm_providers(organization_id);
CREATE INDEX idx_llm_providers_active ON llm_providers(organization_id, is_active) WHERE is_active = true;

-- LLM Models and pricing
CREATE TABLE IF NOT EXISTS llm_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE,
    model_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    cost_per_1k_prompt_tokens DECIMAL(10, 6) NOT NULL,
    cost_per_1k_completion_tokens DECIMAL(10, 6) NOT NULL,
    max_tokens INTEGER,
    context_window INTEGER,
    capabilities JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(provider_id, model_name)
);

CREATE INDEX idx_llm_models_provider ON llm_models(provider_id);
CREATE INDEX idx_llm_models_active ON llm_models(provider_id, is_active) WHERE is_active = true;

-- LLM API requests and usage tracking
CREATE TABLE IF NOT EXISTS llm_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES llm_models(id),

    request_id VARCHAR(255),
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,

    prompt_cost DECIMAL(10, 6) NOT NULL,
    completion_cost DECIMAL(10, 6) NOT NULL,
    total_cost DECIMAL(10, 6) NOT NULL,

    latency_ms INTEGER,
    status VARCHAR(50) CHECK (status IN ('success', 'error', 'rate_limited', 'timeout')),
    error_message TEXT,

    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Partitioning key for TimescaleDB
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_llm_requests_org_time ON llm_requests(organization_id, timestamp DESC);
CREATE INDEX idx_llm_requests_team_time ON llm_requests(team_id, timestamp DESC) WHERE team_id IS NOT NULL;
CREATE INDEX idx_llm_requests_user_time ON llm_requests(user_id, timestamp DESC);
CREATE INDEX idx_llm_requests_model ON llm_requests(model_id, timestamp DESC);
CREATE INDEX idx_llm_requests_status ON llm_requests(status, timestamp DESC);

-- Convert to TimescaleDB hypertable for efficient time-series queries
SELECT create_hypertable('llm_requests', 'created_at', if_not_exists => TRUE);

-- Budgets for cost control
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),

    alert_threshold_percentage INTEGER DEFAULT 80 CHECK (alert_threshold_percentage > 0 AND alert_threshold_percentage <= 100),
    hard_limit BOOLEAN DEFAULT false,

    current_spend DECIMAL(10, 2) DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Only one of organization/team/user should be set
    CHECK (
        (organization_id IS NOT NULL AND team_id IS NULL AND user_id IS NULL) OR
        (organization_id IS NOT NULL AND team_id IS NOT NULL AND user_id IS NULL) OR
        (organization_id IS NOT NULL AND team_id IS NULL AND user_id IS NOT NULL)
    )
);

CREATE INDEX idx_budgets_org ON budgets(organization_id);
CREATE INDEX idx_budgets_team ON budgets(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_budgets_user ON budgets(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_budgets_active ON budgets(is_active, period_end) WHERE is_active = true;

-- Quotas for rate limiting
CREATE TABLE IF NOT EXISTS quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    quota_type VARCHAR(50) NOT NULL CHECK (quota_type IN (
        'requests_per_minute', 'requests_per_hour', 'requests_per_day',
        'tokens_per_minute', 'tokens_per_hour', 'tokens_per_day',
        'cost_per_hour', 'cost_per_day'
    )),

    limit_value BIGINT NOT NULL,
    current_value BIGINT DEFAULT 0,

    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (
        (organization_id IS NOT NULL AND team_id IS NULL AND user_id IS NULL) OR
        (organization_id IS NOT NULL AND team_id IS NOT NULL AND user_id IS NULL) OR
        (organization_id IS NOT NULL AND team_id IS NULL AND user_id IS NOT NULL)
    )
);

CREATE INDEX idx_quotas_org ON quotas(organization_id);
CREATE INDEX idx_quotas_team ON quotas(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_quotas_user ON quotas(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_quotas_active ON quotas(is_active, window_end) WHERE is_active = true;

-- Cost allocation tags
CREATE TABLE IF NOT EXISTS cost_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, key, value)
);

CREATE INDEX idx_cost_tags_org ON cost_tags(organization_id);

-- Request tags for cost allocation
CREATE TABLE IF NOT EXISTS request_tags (
    request_id UUID NOT NULL REFERENCES llm_requests(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES cost_tags(id) ON DELETE CASCADE,

    PRIMARY KEY(request_id, tag_id)
);

CREATE INDEX idx_request_tags_request ON request_tags(request_id);
CREATE INDEX idx_request_tags_tag ON request_tags(tag_id);

-- Materialized view for cost aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_cost_summary AS
SELECT
    organization_id,
    team_id,
    user_id,
    model_id,
    DATE(timestamp) as date,
    COUNT(*) as request_count,
    SUM(prompt_tokens) as total_prompt_tokens,
    SUM(completion_tokens) as total_completion_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(total_cost) as total_cost,
    AVG(latency_ms) as avg_latency_ms,
    COUNT(*) FILTER (WHERE status = 'error') as error_count
FROM llm_requests
GROUP BY organization_id, team_id, user_id, model_id, DATE(timestamp);

CREATE UNIQUE INDEX idx_daily_cost_summary_unique ON daily_cost_summary(
    organization_id,
    COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
    user_id,
    model_id,
    date
);

-- Refresh policy for materialized view
CREATE INDEX idx_daily_cost_summary_date ON daily_cost_summary(date DESC);

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llm_providers_updated_at BEFORE UPDATE ON llm_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llm_models_updated_at BEFORE UPDATE ON llm_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotas_updated_at BEFORE UPDATE ON quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default LLM providers and models for OpenAI and Anthropic
INSERT INTO organizations (name, slug, description) VALUES
('Default Organization', 'default', 'Default organization for self-hosted deployment')
ON CONFLICT (slug) DO NOTHING;

-- Note: Actual provider setup will be done during organization onboarding
-- This just creates the schema

COMMENT ON TABLE organizations IS 'Multi-tenant organizations for self-hosted deployments';
COMMENT ON TABLE llm_providers IS 'LLM API provider configurations (OpenAI, Anthropic, etc.)';
COMMENT ON TABLE llm_models IS 'Available LLM models with pricing information';
COMMENT ON TABLE llm_requests IS 'Time-series tracking of all LLM API requests and costs';
COMMENT ON TABLE budgets IS 'Cost budgets with alerts and hard limits';
COMMENT ON TABLE quotas IS 'Rate limiting and usage quotas';
COMMENT ON TABLE cost_tags IS 'Tags for cost allocation and chargeback';
