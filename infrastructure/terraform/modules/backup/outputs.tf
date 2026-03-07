output "backup_bucket_name" {
  description = "Name of the S3 bucket for database backups"
  value       = aws_s3_bucket.database_backups.id
}

output "backup_bucket_arn" {
  description = "ARN of the S3 bucket for database backups"
  value       = aws_s3_bucket.database_backups.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key for backup encryption"
  value       = aws_kms_key.backup_encryption.arn
}

output "backup_lambda_function_name" {
  description = "Name of the backup orchestrator Lambda function"
  value       = aws_lambda_function.backup_orchestrator.function_name
}

output "disaster_recovery_lambda_function_name" {
  description = "Name of the disaster recovery Lambda function"
  value       = aws_lambda_function.disaster_recovery.function_name
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for backup alerts"
  value       = aws_sns_topic.backup_alerts.arn
}
