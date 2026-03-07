# =============================================================================
# MechMind OS v10 - Staging Environment Configuration
# Production-like for testing, but cost-conscious
# =============================================================================

# Environment
environment = "staging"
owner       = "mechmind-staging-team"

# AWS Regions
aws_region = "us-east-1"
dr_region  = "us-west-2"

# VPC
az_count = 2
vpc_cidr = "10.1.0.0/16"

# Cost Optimization
use_free_tier             = false  # Staging doesn't qualify for free tier
use_aurora_serverless     = false  # Use RDS for cost savings
enable_enhanced_monitoring  = false
enable_performance_insights = false

# Database (Small instance for staging)
db_instance_class         = "db.t3.micro"
db_allocated_storage      = 20
db_max_allocated_storage  = 100
db_engine_version         = "16.2"
db_backup_retention_days  = 3
db_multi_az               = false
db_skip_final_snapshot    = true

# Aurora (not used in staging)
aurora_min_capacity = 0.5
aurora_max_capacity = 2

# Lambda
lambda_runtime       = "nodejs20.x"
lambda_architecture  = "arm64"
lambda_memory_size   = 512
lambda_timeout       = 30
lambda_reserved_concurrent_executions = 20
lambda_log_retention_days = 7

# SQS
sqs_visibility_timeout    = 300
sqs_message_retention     = 86400
sqs_dlq_max_receive_count = 3

# S3
s3_versioning               = true
s3_intelligent_tiering_days = 0
s3_glacier_days             = 90
s3_deep_archive_days        = 180

# Monitoring
enable_detailed_monitoring = true
alarm_email                = "staging-alerts@mechmind.io"
monthly_budget_amount      = 150
monthly_budget_alert_threshold = 80

# Feature Flags
enable_waf         = false
enable_cloudfront  = false
enable_route53     = false
domain_name        = "staging.mechmind.io"
