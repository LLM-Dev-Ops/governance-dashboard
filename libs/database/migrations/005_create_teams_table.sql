-- Migration: 005_create_teams_table.sql
-- Description: Create teams table with hierarchical structure
-- Created: 2025-11-16

-- Teams table with hierarchical support
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    budget DECIMAL(15, 2),
    cost_center VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_parent CHECK (id != parent_team_id)
);

-- Indexes for teams table
CREATE INDEX idx_teams_name ON teams(name);
CREATE INDEX idx_teams_parent_team_id ON teams(parent_team_id);
CREATE INDEX idx_teams_cost_center ON teams(cost_center);
CREATE INDEX idx_teams_metadata ON teams USING GIN(metadata);

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE teams IS 'Organizational teams with hierarchical structure';
COMMENT ON COLUMN teams.name IS 'Team name';
COMMENT ON COLUMN teams.parent_team_id IS 'Parent team for hierarchical organization';
COMMENT ON COLUMN teams.budget IS 'Allocated budget for the team';
COMMENT ON COLUMN teams.cost_center IS 'Cost center identifier';
COMMENT ON COLUMN teams.metadata IS 'Additional team metadata in JSONB format';

-- Team members junction table
CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

-- Indexes for team_members table
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);

COMMENT ON TABLE team_members IS 'Team membership assignments';
COMMENT ON COLUMN team_members.role IS 'Role within the team: owner, admin, member, viewer';
