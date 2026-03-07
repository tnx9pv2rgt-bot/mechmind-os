# =============================================================================
# MechMind OS v10 - Production Environment Configuration
# Free Tier First 12 Months, then Aurora Serverless v2
# =============================================================================

# Environment
environment = "prod"
owner       = "mechmind-production-team"

# AWS Regions
aws_region = "us-east-1"
dr_region  = "us-west-2"

# VPC
az_count = 3
vpc_cidr = "10.2.0.0/16"

# Cost Optimization
# First 12 months: use_free_tier = true (db.t3.micro free)
# After 12 months: switch to use_aurora_serverless = true
use_free_tier             = true
use_aurora_serverless     = false
enable_enhanced_monitoring  = false  # Skip for cost savings
enable_performance_insights = false  # Skip for cost savings

# Database (Free Tier: db.t3.micro + 20GB = $0 for 12 months)
db_instance_class         = "db.t3.micro"
db_allocated_storage      = 20
db_max_allocated_storage  = 100
db_engine_version         = "16.2"
db_backup_retention_days  = 7
db_multi_az               = false  # Skip for cost savings (add later)
db_skip_final_snapshot    = false

# Aurora Serverless v2 (for post free-tier scaling)
# 0.5 ACU minimum = ~$45/mo, 2 ACU max = ~$180/mo
aurora_min_capacity = 0.5
aurora_max_capacity = 2

# Lambda
lambda_runtime       = "nodejs20.x"
lambda_architecture  = "arm64"  # 20% cost savings vs x86_64
lambda_memory_size   = 512
lambda_timeout       = 30
lambda_reserved_concurrent_executions = -1  # Unlimited
lambda_log_retention_days = 14

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
alarm_email                = "alerts@mechmind.io"
monthly_budget_amount      = 250  # Alert at $200 (80% of $250)
monthly_budget_alert_threshold = 80

# Feature Flags (enable as needed)
enable_waf         = false  # Costs ~$5/mo + request charges
enable_cloudfront  = false  # Enable when ready for CDN
enable_route53     = false  # Enable when domain is ready
domain_name        = "app.mechmind.io"

# =============================================================================
# POST FREE-TIER MIGRATION NOTES:
# =============================================================================
# After 12 months, update this file:
#
# use_free_tier         = false
# use_aurora_serverless = true
#
# Then run:
# terraform plan -var-file="environments/prod.tfvars"
# terraform apply -var-file="environments/prod.tfvars"
# =============================================================================
