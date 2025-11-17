-- Migration: 004_create_roles_tables.sql
-- Description: Create roles and role assignment tables
-- Created: 2025-11-16

-- Roles table with hierarchical support
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_permissions CHECK (validate_permissions(permissions)),
    CONSTRAINT no_self_parent CHECK (id != parent_role_id)
);

-- Indexes for roles table
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_parent_role_id ON roles(parent_role_id);
CREATE INDEX idx_roles_is_system_role ON roles(is_system_role);
CREATE INDEX idx_roles_permissions ON roles USING GIN(permissions);

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE roles IS 'Role definitions with hierarchical permissions';
COMMENT ON COLUMN roles.name IS 'Unique role name';
COMMENT ON COLUMN roles.permissions IS 'JSONB permissions structure';
COMMENT ON COLUMN roles.parent_role_id IS 'Parent role for inheritance';
COMMENT ON COLUMN roles.is_system_role IS 'System roles cannot be deleted';

-- User roles junction table
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, role_id)
);

-- Indexes for user_roles table
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_granted_at ON user_roles(granted_at);
CREATE INDEX idx_user_roles_granted_by ON user_roles(granted_by);

COMMENT ON TABLE user_roles IS 'User to role assignments';
COMMENT ON COLUMN user_roles.granted_by IS 'User who granted this role';
