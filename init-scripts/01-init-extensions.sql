-- ==========================================
-- MechMind OS v10 - PostgreSQL Initialization
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom schema for app settings
CREATE SCHEMA IF NOT EXISTS app;

-- Set timezone
SET TIMEZONE = 'UTC';
