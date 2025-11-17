-- ============================================================================
-- LLM Governance Dashboard - Database Initialization
-- ============================================================================
-- This script initializes the database and runs all migrations
-- It's executed automatically by Docker when the postgres container starts
-- ============================================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create the update_updated_at_column function used by triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- Now run the organization and cost tracking migration
-- ============================================================================

\echo 'Creating organizations and cost tracking tables...'
\i /docker-entrypoint-initdb.d/migrations/0011_organizations_and_cost_tracking.sql

\echo 'Database initialization complete!'
