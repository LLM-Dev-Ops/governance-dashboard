-- Migration: 010_create_views.sql
-- Description: Create database views for common queries
-- Created: 2025-11-16

-- User permissions view (aggregates permissions from all assigned roles)
CREATE OR REPLACE VIEW user_permissions_view AS
WITH RECURSIVE role_hierarchy AS (
    -- Base case: direct role assignments
    SELECT
        ur.user_id,
        r.id AS role_id,
        r.name AS role_name,
        r.permissions,
        r.parent_role_id,
        1 AS depth
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id

    UNION ALL

    -- Recursive case: inherited roles
    SELECT
        rh.user_id,
        r.id AS role_id,
        r.name AS role_name,
        r.permissions,
        r.parent_role_id,
        rh.depth + 1 AS depth
    FROM role_hierarchy rh
    JOIN roles r ON rh.parent_role_id = r.id
    WHERE rh.parent_role_id IS NOT NULL AND rh.depth < 10 -- Prevent infinite loops
)
SELECT
    u.id AS user_id,
    u.email,
    u.name,
    jsonb_agg(DISTINCT jsonb_build_object(
        'role_id', rh.role_id,
        'role_name', rh.role_name,
        'permissions', rh.permissions,
        'depth', rh.depth
    )) AS roles,
    (
        SELECT jsonb_object_agg(key, value)
        FROM (
            SELECT DISTINCT key, value
            FROM role_hierarchy rh2
            CROSS JOIN jsonb_each(rh2.permissions)
            WHERE rh2.user_id = u.id
        ) AS permissions
    ) AS aggregated_permissions
FROM users u
LEFT JOIN role_hierarchy rh ON u.id = rh.user_id
GROUP BY u.id, u.email, u.name;

COMMENT ON VIEW user_permissions_view IS 'Aggregated user permissions from all assigned roles including inheritance';

-- Team hierarchy view (recursive team structure)
CREATE OR REPLACE VIEW team_hierarchy_view AS
WITH RECURSIVE team_tree AS (
    -- Base case: root teams
    SELECT
        t.id,
        t.name,
        t.parent_team_id,
        t.budget,
        t.cost_center,
        t.metadata,
        ARRAY[t.id] AS path,
        0 AS depth,
        t.name AS root_team_name,
        t.id AS root_team_id
    FROM teams t
    WHERE t.parent_team_id IS NULL

    UNION ALL

    -- Recursive case: child teams
    SELECT
        t.id,
        t.name,
        t.parent_team_id,
        t.budget,
        t.cost_center,
        t.metadata,
        tt.path || t.id AS path,
        tt.depth + 1 AS depth,
        tt.root_team_name,
        tt.root_team_id
    FROM teams t
    JOIN team_tree tt ON t.parent_team_id = tt.id
    WHERE NOT t.id = ANY(tt.path) AND tt.depth < 10 -- Prevent infinite loops
)
SELECT
    tt.id AS team_id,
    tt.name AS team_name,
    tt.parent_team_id,
    tt.budget,
    tt.cost_center,
    tt.metadata,
    tt.depth,
    tt.root_team_name,
    tt.root_team_id,
    array_to_string(tt.path, ' > ') AS path_string,
    (
        SELECT COUNT(*)
        FROM team_members tm
        WHERE tm.team_id = tt.id
    ) AS member_count,
    (
        SELECT COUNT(*)
        FROM teams t
        WHERE t.parent_team_id = tt.id
    ) AS child_team_count
FROM team_tree tt;

COMMENT ON VIEW team_hierarchy_view IS 'Hierarchical team structure with path and metrics';

-- Cost summary view (aggregated costs by multiple dimensions)
CREATE OR REPLACE VIEW cost_summary_view AS
SELECT
    DATE(time) AS date,
    provider,
    model,
    team_id,
    user_id,
    COUNT(*) AS request_count,
    SUM(tokens_in) AS total_tokens_in,
    SUM(tokens_out) AS total_tokens_out,
    SUM(cost) AS total_cost,
    AVG(cost) AS avg_cost,
    MIN(cost) AS min_cost,
    MAX(cost) AS max_cost,
    AVG(latency_ms) AS avg_latency_ms,
    COUNT(CASE WHEN status = 'error' THEN 1 END) AS error_count,
    COUNT(CASE WHEN status = 'success' THEN 1 END) AS success_count
FROM llm_metrics
WHERE time >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(time), provider, model, team_id, user_id;

COMMENT ON VIEW cost_summary_view IS 'Daily cost summary aggregated by provider, model, team, and user';

-- Active sessions view
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT
    s.id AS session_id,
    s.user_id,
    u.email,
    u.name,
    s.ip_address,
    s.user_agent,
    s.created_at,
    s.expires_at,
    EXTRACT(EPOCH FROM (s.expires_at - CURRENT_TIMESTAMP)) AS seconds_until_expiry
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > CURRENT_TIMESTAMP
ORDER BY s.created_at DESC;

COMMENT ON VIEW active_sessions_view IS 'Currently active user sessions';

-- Alert summary view
CREATE OR REPLACE VIEW alert_summary_view AS
SELECT
    alert_type,
    severity,
    COUNT(*) AS total_count,
    COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) AS unresolved_count,
    COUNT(CASE WHEN acknowledged_at IS NULL AND resolved_at IS NULL THEN 1 END) AS unacknowledged_count,
    MAX(triggered_at) AS latest_trigger,
    AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, CURRENT_TIMESTAMP) - triggered_at))) AS avg_resolution_time_seconds
FROM alerts
WHERE triggered_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY alert_type, severity
ORDER BY severity DESC, alert_type;

COMMENT ON VIEW alert_summary_view IS 'Alert statistics by type and severity for the last 30 days';

-- Policy compliance view
CREATE OR REPLACE VIEW policy_compliance_view AS
SELECT
    p.id AS policy_id,
    p.name AS policy_name,
    p.policy_type,
    p.enforcement_level,
    p.status,
    COUNT(DISTINCT pa.team_id) AS assigned_teams_count,
    COUNT(DISTINCT pa.user_id) AS assigned_users_count,
    COUNT(DISTINCT a.id) AS related_alerts_count,
    COUNT(DISTINCT CASE WHEN a.resolved_at IS NULL THEN a.id END) AS unresolved_alerts_count
FROM policies p
LEFT JOIN policy_assignments pa ON p.id = pa.policy_id
LEFT JOIN alerts a ON p.id = a.related_policy_id AND a.triggered_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY p.id, p.name, p.policy_type, p.enforcement_level, p.status
ORDER BY p.status DESC, p.policy_type;

COMMENT ON VIEW policy_compliance_view IS 'Policy compliance summary with assignment and alert statistics';

-- User activity summary view
CREATE OR REPLACE VIEW user_activity_summary_view AS
SELECT
    u.id AS user_id,
    u.email,
    u.name,
    u.status,
    COUNT(DISTINCT s.id) AS active_sessions,
    COUNT(DISTINCT ak.id) AS active_api_keys,
    COUNT(DISTINCT tm.team_id) AS team_memberships,
    COUNT(DISTINCT ur.role_id) AS role_assignments,
    (
        SELECT COUNT(*)
        FROM audit_logs al
        WHERE al.user_id = u.id AND al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    ) AS actions_last_7_days,
    (
        SELECT SUM(cost)
        FROM llm_metrics lm
        WHERE lm.user_id = u.id AND lm.time >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    ) AS total_cost_last_30_days
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.expires_at > CURRENT_TIMESTAMP
LEFT JOIN api_keys ak ON u.id = ak.user_id AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email, u.name, u.status;

COMMENT ON VIEW user_activity_summary_view IS 'User activity and usage summary';
