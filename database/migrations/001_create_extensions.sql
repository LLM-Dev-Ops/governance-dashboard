-- Migration: 001_create_extensions.sql
-- Description: Enable required PostgreSQL extensions
-- Created: 2025-11-16

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable TimescaleDB for time-series data
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Enable pg_trgm for text search optimization
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable btree_gist for advanced indexing
CREATE EXTENSION IF NOT EXISTS "btree_gist";

COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for password hashing';
COMMENT ON EXTENSION "timescaledb" IS 'Time-series database functionality';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram matching for text search';
COMMENT ON EXTENSION "btree_gist" IS 'GiST index support for B-tree data types';
