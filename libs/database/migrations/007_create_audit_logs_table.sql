-- Migration: 007_create_audit_logs_table.sql
-- Description: Create audit logs table with integrity checksums
-- Created: 2025-11-16

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    ip_address INET,
    details JSONB DEFAULT '{}',
    checksum TEXT NOT NULL
);

-- Indexes for audit_logs table
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_details ON audit_logs USING GIN(details);
CREATE INDEX idx_audit_logs_composite ON audit_logs(user_id, timestamp DESC);

-- Trigger to auto-populate checksum
CREATE TRIGGER trigger_audit_logs_checksum
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all system actions';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the action occurred';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., CREATE, UPDATE, DELETE, LOGIN)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client';
COMMENT ON COLUMN audit_logs.details IS 'Additional details in JSONB format';
COMMENT ON COLUMN audit_logs.checksum IS 'SHA-256 checksum for integrity verification';

-- Prevent updates and deletes on audit logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_log_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trigger_prevent_audit_log_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

COMMENT ON FUNCTION prevent_audit_log_modification() IS 'Prevents modification or deletion of audit logs';
