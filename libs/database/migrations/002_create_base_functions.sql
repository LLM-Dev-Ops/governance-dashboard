-- Migration: 002_create_base_functions.sql
-- Description: Create utility functions and triggers
-- Created: 2025-11-16

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at() IS 'Automatically updates the updated_at timestamp on row modification';

-- Function to generate audit log checksum
CREATE OR REPLACE FUNCTION generate_audit_checksum(
    p_timestamp TIMESTAMP,
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_details JSONB
)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            COALESCE(p_timestamp::TEXT, '') ||
            COALESCE(p_user_id::TEXT, '') ||
            COALESCE(p_action, '') ||
            COALESCE(p_resource_type, '') ||
            COALESCE(p_resource_id, '') ||
            COALESCE(p_details::TEXT, '{}'),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_audit_checksum(TIMESTAMP, UUID, TEXT, TEXT, TEXT, JSONB) IS 'Generates SHA-256 checksum for audit log integrity';

-- Function to automatically populate audit log checksum
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.checksum = generate_audit_checksum(
        NEW.timestamp,
        NEW.user_id,
        NEW.action,
        NEW.resource_type,
        NEW.resource_id,
        NEW.details
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_log_trigger() IS 'Trigger function to auto-populate audit log checksum';

-- Function to validate JSONB permissions schema
CREATE OR REPLACE FUNCTION validate_permissions(p_permissions JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if permissions is a valid JSON object
    IF p_permissions IS NULL OR jsonb_typeof(p_permissions) != 'object' THEN
        RETURN FALSE;
    END IF;

    -- Add additional validation logic as needed
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_permissions(JSONB) IS 'Validates permissions JSONB structure';
