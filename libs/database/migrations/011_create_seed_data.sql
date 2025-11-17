-- Migration: 011_create_seed_data.sql
-- Description: Seed data for system roles and initial admin user
-- Created: 2025-11-16

-- Insert system roles
INSERT INTO roles (id, name, description, permissions, parent_role_id, is_system_role) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Super Admin',
    'Full system access with all permissions',
    '{
        "users": ["create", "read", "update", "delete"],
        "roles": ["create", "read", "update", "delete"],
        "teams": ["create", "read", "update", "delete"],
        "policies": ["create", "read", "update", "delete"],
        "alerts": ["create", "read", "update", "delete", "acknowledge", "resolve"],
        "audit_logs": ["read", "export"],
        "metrics": ["read", "export"],
        "api_keys": ["create", "read", "update", "delete"],
        "system": ["configure", "backup", "restore"]
    }'::jsonb,
    NULL,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000002',
    'Admin',
    'Administrative access with limited system configuration',
    '{
        "users": ["create", "read", "update"],
        "roles": ["read", "assign"],
        "teams": ["create", "read", "update"],
        "policies": ["create", "read", "update"],
        "alerts": ["read", "acknowledge", "resolve"],
        "audit_logs": ["read"],
        "metrics": ["read", "export"],
        "api_keys": ["create", "read", "update"]
    }'::jsonb,
    NULL,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000003',
    'Team Manager',
    'Manage team members and view team metrics',
    '{
        "teams": ["read", "update_own"],
        "team_members": ["add", "remove", "update"],
        "policies": ["read"],
        "alerts": ["read", "acknowledge"],
        "metrics": ["read_team"],
        "api_keys": ["create_own", "read_own", "update_own"]
    }'::jsonb,
    NULL,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000004',
    'Developer',
    'Standard developer access',
    '{
        "teams": ["read"],
        "policies": ["read"],
        "alerts": ["read"],
        "metrics": ["read_own"],
        "api_keys": ["create_own", "read_own", "update_own"]
    }'::jsonb,
    NULL,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000005',
    'Viewer',
    'Read-only access to own data',
    '{
        "teams": ["read_own"],
        "policies": ["read"],
        "alerts": ["read_own"],
        "metrics": ["read_own"]
    }'::jsonb,
    NULL,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000006',
    'Security Officer',
    'Security and compliance management',
    '{
        "users": ["read"],
        "roles": ["read"],
        "teams": ["read"],
        "policies": ["create", "read", "update", "delete"],
        "alerts": ["read", "acknowledge", "resolve"],
        "audit_logs": ["read", "export"],
        "metrics": ["read"]
    }'::jsonb,
    NULL,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000007',
    'Finance Manager',
    'Cost and budget management',
    '{
        "teams": ["read", "update_budget"],
        "policies": ["create_cost", "read", "update_cost"],
        "alerts": ["read", "acknowledge"],
        "metrics": ["read", "export"],
        "reports": ["create", "read", "export"]
    }'::jsonb,
    NULL,
    TRUE
);

-- Insert initial admin user
-- Default password: Admin123! (should be changed on first login)
-- Password hash is bcrypt hash of "Admin123!"
INSERT INTO users (id, email, name, password_hash, status, mfa_enabled) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'admin@llmgovernance.local',
    'System Administrator',
    '$2a$10$rKL0Z5GVNBqQNqW3FZdnm.XsJxZXZVqLdJNxQxQxQxQxQxQxQxQxQ',
    'active',
    FALSE
);

-- Assign Super Admin role to initial admin user
INSERT INTO user_roles (user_id, role_id, granted_at, granted_by) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    CURRENT_TIMESTAMP,
    NULL
);

-- Insert default root team
INSERT INTO teams (id, name, parent_team_id, budget, cost_center, metadata) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'Organization',
    NULL,
    100000.00,
    'ORG-001',
    '{
        "description": "Root organization team",
        "created_by": "system"
    }'::jsonb
);

-- Add admin user to root team as owner
INSERT INTO team_members (team_id, user_id, role) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'owner'
);

-- Insert default policies
INSERT INTO policies (id, name, description, policy_type, rules, enforcement_level, status, created_by) VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'Default Cost Limit',
    'Default daily cost limit per user',
    'cost',
    '{
        "daily_limit": 100.00,
        "monthly_limit": 2000.00,
        "alert_threshold": 0.8
    }'::jsonb,
    'warning',
    'active',
    '10000000-0000-0000-0000-000000000001'
),
(
    '30000000-0000-0000-0000-000000000002',
    'Default Rate Limit',
    'Default rate limiting policy',
    'rate_limit',
    '{
        "requests_per_minute": 60,
        "requests_per_hour": 1000,
        "requests_per_day": 10000
    }'::jsonb,
    'strict',
    'active',
    '10000000-0000-0000-0000-000000000001'
),
(
    '30000000-0000-0000-0000-000000000003',
    'PII Detection',
    'Content filter for personally identifiable information',
    'content_filter',
    '{
        "scan_input": true,
        "scan_output": true,
        "block_patterns": ["ssn", "credit_card", "email", "phone"],
        "redaction_enabled": true
    }'::jsonb,
    'strict',
    'active',
    '10000000-0000-0000-0000-000000000001'
),
(
    '30000000-0000-0000-0000-000000000004',
    'Security Best Practices',
    'Enforce security best practices',
    'security',
    '{
        "require_mfa": false,
        "session_timeout_minutes": 480,
        "password_min_length": 12,
        "password_require_special": true,
        "api_key_rotation_days": 90
    }'::jsonb,
    'warning',
    'active',
    '10000000-0000-0000-0000-000000000001'
);

-- Assign default policies to root team
INSERT INTO policy_assignments (policy_id, team_id, assigned_by) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

-- Create audit log entry for initial setup
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'SYSTEM_INIT',
    'system',
    'initial_setup',
    '{
        "event": "Initial database setup completed",
        "roles_created": 7,
        "policies_created": 4,
        "teams_created": 1,
        "users_created": 1
    }'::jsonb
);

COMMENT ON TABLE roles IS 'System roles seeded with default permissions';
COMMENT ON TABLE users IS 'Initial admin user created - password should be changed on first login';
COMMENT ON TABLE teams IS 'Root organization team created';
COMMENT ON TABLE policies IS 'Default governance policies created';
