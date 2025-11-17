-- Migration: 008_create_alerts_table.sql
-- Description: Create alerts table for notifications and incidents
-- Created: 2025-11-16

-- Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('cost', 'security', 'compliance', 'performance', 'quota', 'anomaly')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    related_policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
    related_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for alerts table
CREATE INDEX idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at DESC);
CREATE INDEX idx_alerts_acknowledged_at ON alerts(acknowledged_at);
CREATE INDEX idx_alerts_resolved_at ON alerts(resolved_at);
CREATE INDEX idx_alerts_related_policy_id ON alerts(related_policy_id);
CREATE INDEX idx_alerts_related_team_id ON alerts(related_team_id);
CREATE INDEX idx_alerts_related_user_id ON alerts(related_user_id);
CREATE INDEX idx_alerts_metadata ON alerts USING GIN(metadata);
CREATE INDEX idx_alerts_unresolved ON alerts(severity, triggered_at DESC) WHERE resolved_at IS NULL;

COMMENT ON TABLE alerts IS 'System alerts and notifications';
COMMENT ON COLUMN alerts.alert_type IS 'Type of alert: cost, security, compliance, performance, quota, anomaly';
COMMENT ON COLUMN alerts.severity IS 'Alert severity: critical, high, medium, low, info';
COMMENT ON COLUMN alerts.triggered_at IS 'When the alert was triggered';
COMMENT ON COLUMN alerts.acknowledged_at IS 'When the alert was acknowledged';
COMMENT ON COLUMN alerts.acknowledged_by IS 'User who acknowledged the alert';
COMMENT ON COLUMN alerts.resolved_at IS 'When the alert was resolved';
COMMENT ON COLUMN alerts.resolved_by IS 'User who resolved the alert';
COMMENT ON COLUMN alerts.metadata IS 'Additional alert metadata in JSONB format';

-- Alert subscriptions table
CREATE TABLE alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('cost', 'security', 'compliance', 'performance', 'quota', 'anomaly')),
    min_severity VARCHAR(50) NOT NULL CHECK (min_severity IN ('critical', 'high', 'medium', 'low', 'info')),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    notification_channels JSONB DEFAULT '{"email": true, "slack": false, "webhook": false}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for alert_subscriptions table
CREATE INDEX idx_alert_subscriptions_user_id ON alert_subscriptions(user_id);
CREATE INDEX idx_alert_subscriptions_alert_type ON alert_subscriptions(alert_type);
CREATE INDEX idx_alert_subscriptions_team_id ON alert_subscriptions(team_id);

COMMENT ON TABLE alert_subscriptions IS 'User alert subscription preferences';
COMMENT ON COLUMN alert_subscriptions.min_severity IS 'Minimum severity level to receive notifications';
COMMENT ON COLUMN alert_subscriptions.notification_channels IS 'Preferred notification channels';
