# =============================================================================
# MechMind OS v10 - Terraform Outputs
# Useful information for deployment and integration
# =============================================================================

# =============================================================================
# General Information
# =============================================================================

output "account_id" {
  description = "AWS Account ID"
  value       = local.account_id
}

output "region" {
  description = "AWS Region"
  value       = local.region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# =============================================================================
# VPC Outputs
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = data.aws_availability_zones.available.names
}

# =============================================================================
# Database Outputs
# =============================================================================

output "database_endpoint" {
  description = "Database endpoint address"
  value       = local.use_aurora ? aws_rds_cluster.aurora_serverless[0].endpoint : aws_db_instance.postgres_free[0].address
  sensitive   = true
}

output "database_port" {
  description = "Database port"
  value       = 5432
}

output "database_name" {
  description = "Database name"
  value       = var.db_name
}

output "database_username" {
  description = "Database username"
  value       = var.db_username
  sensitive   = true
}

output "database_instance_id" {
  description = "RDS instance or cluster ID"
  value       = local.use_aurora ? aws_rds_cluster.aurora_serverless[0].id : aws_db_instance.postgres_free[0].id
}

output "database_arn" {
  description = "RDS instance or cluster ARN"
  value       = local.use_aurora ? aws_rds_cluster.aurora_serverless[0].arn : aws_db_instance.postgres_free[0].arn
}

output "database_type" {
  description = "Type of database (aurora or postgres)"
  value       = local.use_aurora ? "aurora-serverless-v2" : "rds-postgres"
}

# =============================================================================
# Lambda Outputs
# =============================================================================

output "lambda_api_function_name" {
  description = "Main API Lambda function name"
  value       = aws_lambda_function.api_main.function_name
}

output "lambda_api_function_arn" {
  description = "Main API Lambda function ARN"
  value       = aws_lambda_function.api_main.arn
}

output "lambda_api_function_url" {
  description = "Main API Lambda function URL"
  value       = aws_lambda_function_url.api_public.function_url
}

output "lambda_worker_function_name" {
  description = "Worker Lambda function name"
  value       = aws_lambda_function.worker_booking.function_name
}

output "lambda_voice_handler_function_name" {
  description = "Voice handler Lambda function name"
  value       = aws_lambda_function.voice_handler.function_name
}

output "lambda_execution_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda_execution.arn
}

# =============================================================================
# SQS Outputs
# =============================================================================

output "sqs_booking_queue_url" {
  description = "Booking confirmations SQS queue URL"
  value       = aws_sqs_queue.booking_confirmations.url
}

output "sqs_booking_queue_arn" {
  description = "Booking confirmations SQS queue ARN"
  value       = aws_sqs_queue.booking_confirmations.arn
}

output "sqs_notification_queue_url" {
  description = "Notification SQS queue URL"
  value       = aws_sqs_queue.notifications.url
}

output "sqs_notification_queue_arn" {
  description = "Notification SQS queue ARN"
  value       = aws_sqs_queue.notifications.arn
}

output "sqs_dlq_url" {
  description = "Dead Letter Queue URL"
  value       = aws_sqs_queue.dlq.url
}

# =============================================================================
# S3 Outputs
# =============================================================================

output "s3_bucket_name" {
  description = "Main S3 bucket name"
  value       = aws_s3_bucket.mechmind_storage.id
}

output "s3_bucket_arn" {
  description = "Main S3 bucket ARN"
  value       = aws_s3_bucket.mechmind_storage.arn
}

output "s3_bucket_regional_domain" {
  description = "S3 bucket regional domain name"
  value       = aws_s3_bucket.mechmind_storage.bucket_regional_domain_name
}

# =============================================================================
# Secrets Manager Outputs
# =============================================================================

output "secrets_manager_db_secret_arn" {
  description = "Database credentials secret ARN"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secrets_manager_vapi_key_arn" {
  description = "Vapi API key secret ARN"
  value       = aws_secretsmanager_secret.vapi_key.arn
}

output "secrets_manager_jwt_secret_arn" {
  description = "JWT signing key secret ARN"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

# =============================================================================
# Security Group Outputs
# =============================================================================

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "lambda_security_group_id" {
  description = "Lambda security group ID"
  value       = aws_security_group.lambda.id
}

# =============================================================================
# Parameter Store Outputs
# =============================================================================

output "ssm_parameter_environment" {
  description = "Environment parameter ARN"
  value       = aws_ssm_parameter.environment.arn
}

output "ssm_parameter_database_host" {
  description = "Database host parameter ARN"
  value       = aws_ssm_parameter.database_host.arn
}

# =============================================================================
# Monitoring Outputs
# =============================================================================

output "cloudwatch_log_group_api" {
  description = "API Lambda CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda_api.name
}

output "budget_name" {
  description = "AWS Budget name"
  value       = aws_budgets_budget.mechmind_monthly.name
}

# =============================================================================
# Cost Information
# =============================================================================

output "estimated_monthly_cost" {
  description = "Estimated monthly infrastructure cost"
  value       = var.use_free_tier ? "~$0-50 (free tier eligible)" : "~$60-150 (standard pricing)"
}

output "cost_optimization_notes" {
  description = "Cost optimization recommendations"
  value       = <<-EOT
    Cost Optimization for MechMind OS:
    
    1. RDS Free Tier (12 months): db.t3.micro with 20GB storage = $0
    2. Lambda: 1M free requests/month, 400k GB-seconds = $0 for MVP
    3. SQS: 1M free requests/month = $0
    4. S3: ~$0.023/GB for standard storage
    5. CloudWatch: 10 free custom metrics, 10 alarms = $0
    6. Secrets Manager: $0.40/secret/month (first 30 days free)
    
    Post Free-Tier (Month 13+):
    - Switch to Aurora Serverless v2 (0.5-2 ACU)
    - Monitor Lambda usage and consider provisioned concurrency if needed
    - Enable S3 Intelligent-Tiering for cost savings
  EOT
}

# =============================================================================
# Deployment Information
# =============================================================================

output "deployment_commands" {
  description = "Useful deployment commands"
  value       = <<-EOT
    # Initialize Terraform
    terraform init
    
    # Plan changes
    terraform plan -var-file="environments/${var.environment}.tfvars"
    
    # Apply changes
    terraform apply -var-file="environments/${var.environment}.tfvars"
    
    # Destroy (use with caution)
    terraform destroy -var-file="environments/${var.environment}.tfvars"
  EOT
}
