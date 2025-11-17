-- Migration: 009_create_metrics_tables.sql
-- Description: Create TimescaleDB hypertables for metrics
-- Created: 2025-11-16

-- LLM metrics table (time-series data)
CREATE TABLE llm_metrics (
    time TIMESTAMP NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    request_id VARCHAR(255),
    endpoint VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('success', 'error', 'timeout', 'rate_limited'))
);

-- Create hypertable for llm_metrics
SELECT create_hypertable('llm_metrics', 'time');

-- Indexes for llm_metrics table
CREATE INDEX idx_llm_metrics_provider ON llm_metrics(provider, time DESC);
CREATE INDEX idx_llm_metrics_model ON llm_metrics(model, time DESC);
CREATE INDEX idx_llm_metrics_user_id ON llm_metrics(user_id, time DESC);
CREATE INDEX idx_llm_metrics_team_id ON llm_metrics(team_id, time DESC);
CREATE INDEX idx_llm_metrics_status ON llm_metrics(status, time DESC);
CREATE INDEX idx_llm_metrics_metadata ON llm_metrics USING GIN(metadata);
CREATE INDEX idx_llm_metrics_composite ON llm_metrics(team_id, provider, model, time DESC);

-- Enable compression on llm_metrics (compress data older than 7 days)
ALTER TABLE llm_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'provider, model, user_id, team_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('llm_metrics', INTERVAL '7 days');

-- Enable retention policy (keep data for 2 years)
SELECT add_retention_policy('llm_metrics', INTERVAL '2 years');

COMMENT ON TABLE llm_metrics IS 'Time-series LLM usage metrics';
COMMENT ON COLUMN llm_metrics.time IS 'Timestamp of the metric';
COMMENT ON COLUMN llm_metrics.provider IS 'LLM provider (e.g., OpenAI, Anthropic, Azure)';
COMMENT ON COLUMN llm_metrics.model IS 'Model name (e.g., gpt-4, claude-3-opus)';
COMMENT ON COLUMN llm_metrics.tokens_in IS 'Input tokens consumed';
COMMENT ON COLUMN llm_metrics.tokens_out IS 'Output tokens generated';
COMMENT ON COLUMN llm_metrics.latency_ms IS 'Request latency in milliseconds';
COMMENT ON COLUMN llm_metrics.cost IS 'Cost of the request in USD';
COMMENT ON COLUMN llm_metrics.metadata IS 'Additional metadata in JSONB format';

-- System metrics table (time-series data)
CREATE TABLE system_metrics (
    time TIMESTAMP NOT NULL,
    service VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    labels JSONB DEFAULT '{}',
    unit VARCHAR(50)
);

-- Create hypertable for system_metrics
SELECT create_hypertable('system_metrics', 'time');

-- Indexes for system_metrics table
CREATE INDEX idx_system_metrics_service ON system_metrics(service, time DESC);
CREATE INDEX idx_system_metrics_metric_name ON system_metrics(metric_name, time DESC);
CREATE INDEX idx_system_metrics_labels ON system_metrics USING GIN(labels);
CREATE INDEX idx_system_metrics_composite ON system_metrics(service, metric_name, time DESC);

-- Enable compression on system_metrics (compress data older than 7 days)
ALTER TABLE system_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'service, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('system_metrics', INTERVAL '7 days');

-- Enable retention policy (keep data for 1 year)
SELECT add_retention_policy('system_metrics', INTERVAL '1 year');

COMMENT ON TABLE system_metrics IS 'Time-series system performance metrics';
COMMENT ON COLUMN system_metrics.service IS 'Service name generating the metric';
COMMENT ON COLUMN system_metrics.metric_name IS 'Name of the metric';
COMMENT ON COLUMN system_metrics.value IS 'Metric value';
COMMENT ON COLUMN system_metrics.labels IS 'Additional labels in JSONB format';
COMMENT ON COLUMN system_metrics.unit IS 'Unit of measurement';

-- Continuous aggregates for daily LLM metrics
CREATE MATERIALIZED VIEW llm_metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    provider,
    model,
    user_id,
    team_id,
    COUNT(*) AS request_count,
    SUM(tokens_in) AS total_tokens_in,
    SUM(tokens_out) AS total_tokens_out,
    AVG(latency_ms) AS avg_latency_ms,
    SUM(cost) AS total_cost,
    COUNT(CASE WHEN status = 'error' THEN 1 END) AS error_count
FROM llm_metrics
GROUP BY bucket, provider, model, user_id, team_id;

-- Add refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('llm_metrics_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

COMMENT ON MATERIALIZED VIEW llm_metrics_daily IS 'Daily aggregated LLM metrics for faster queries';

-- Continuous aggregates for hourly LLM metrics
CREATE MATERIALIZED VIEW llm_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    provider,
    model,
    team_id,
    COUNT(*) AS request_count,
    SUM(tokens_in) AS total_tokens_in,
    SUM(tokens_out) AS total_tokens_out,
    AVG(latency_ms) AS avg_latency_ms,
    SUM(cost) AS total_cost
FROM llm_metrics
GROUP BY bucket, provider, model, team_id;

-- Add refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('llm_metrics_hourly',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '15 minutes');

COMMENT ON MATERIALIZED VIEW llm_metrics_hourly IS 'Hourly aggregated LLM metrics for real-time dashboards';
