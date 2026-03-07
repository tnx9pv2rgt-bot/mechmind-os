# MechMind OS - Backup and Disaster Recovery Infrastructure
# Terraform module for automated backups (RDS + S3)

# ==========================================
# S3 BUCKET FOR MANUAL BACKUPS
# ==========================================

resource "aws_s3_bucket" "database_backups" {
  bucket = "${var.project_name}-db-backups-${var.environment}-${random_id.bucket_suffix.hex}"
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-db-backups"
    Purpose = "Database backups"
  })
}

resource "aws_s3_bucket_versioning" "database_backups" {
  bucket = aws_s3_bucket.database_backups.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "database_backups" {
  bucket = aws_s3_bucket.database_backups.id
  
  rule {
    id     = "transition-to-glacier"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365 # Keep backups for 1 year (GDPR compliance)
    }
  }
  
  rule {
    id     = "delete-old-versions"
    status = "Enabled"
    
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "database_backups" {
  bucket = aws_s3_bucket.database_backups.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.backup_encryption.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "database_backups" {
  bucket = aws_s3_bucket.database_backups.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# ==========================================
# KMS KEY FOR BACKUP ENCRYPTION
# ==========================================

resource "aws_kms_key" "backup_encryption" {
  description             = "KMS key for database backup encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow RDS Service"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow Lambda Service"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = var.common_tags
}

resource "aws_kms_alias" "backup_encryption" {
  name          = "alias/${var.project_name}-backup-${var.environment}"
  target_key_id = aws_kms_key.backup_encryption.key_id
}

# ==========================================
# RDS AUTOMATED BACKUPS
# ==========================================

# Note: The RDS instance itself is created in the rds module
# This configures backup settings via parameter group and options

resource "aws_db_parameter_group" "backup_optimized" {
  family = "postgres15"
  name   = "${var.project_name}-backup-optimized-${var.environment}"
  
  parameter {
    name  = "log retention_period"
    value = "7"
  }
  
  parameter {
    name  = "backup retention_period"
    value = tostring(var.backup_retention_days)
  }
  
  tags = var.common_tags
}

# ==========================================
# BACKUP LAMBDA FUNCTION
# ==========================================

resource "aws_lambda_function" "backup_orchestrator" {
  function_name = "${var.project_name}-backup-orchestrator-${var.environment}"
  role          = aws_iam_role.backup_lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 900 # 15 minutes
  memory_size   = 1024
  
  filename         = data.archive_file.backup_lambda.output_path
  source_code_hash = data.archive_file.backup_lambda.output_base64sha256
  
  environment {
    variables = {
      DB_HOST              = var.db_host
      DB_NAME              = var.db_name
      DB_USER              = var.db_username
      DB_PASSWORD_SECRET   = var.db_password_secret_arn
      BACKUP_BUCKET        = aws_s3_bucket.database_backups.id
      KMS_KEY_ID           = aws_kms_key.backup_encryption.arn
      ENVIRONMENT          = var.environment
      SLACK_WEBHOOK_URL    = var.slack_webhook_url
      RETENTION_DAYS       = tostring(var.backup_retention_days)
    }
  }
  
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.backup_lambda.id]
  }
  
  tags = var.common_tags
}

resource "aws_cloudwatch_event_rule" "daily_backup" {
  name                = "${var.project_name}-daily-backup-${var.environment}"
  description         = "Trigger database backup daily"
  schedule_expression = "cron(0 2 * * ? *)" # 2 AM UTC daily
  
  tags = var.common_tags
}

resource "aws_cloudwatch_event_target" "daily_backup" {
  rule      = aws_cloudwatch_event_rule.daily_backup.name
  target_id = "BackupLambda"
  arn       = aws_lambda_function.backup_orchestrator.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup_orchestrator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_backup.arn
}

# ==========================================
# DISASTER RECOVERY LAMBDA
# ==========================================

resource "aws_lambda_function" "disaster_recovery" {
  function_name = "${var.project_name}-disaster-recovery-${var.environment}"
  role          = aws_iam_role.backup_lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 1800 # 30 minutes
  memory_size   = 2048
  
  filename         = data.archive_file.disaster_recovery_lambda.output_path
  source_code_hash = data.archive_file.disaster_recovery_lambda.output_base64sha256
  
  environment {
    variables = {
      DB_HOST               = var.db_host
      DB_NAME               = var.db_name
      BACKUP_BUCKET         = aws_s3_bucket.database_backups.id
      KMS_KEY_ID            = aws_kms_key.backup_encryption.arn
      ENVIRONMENT           = var.environment
      DR_REGION             = var.dr_region
      SLACK_WEBHOOK_URL     = var.slack_webhook_url
    }
  }
  
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.backup_lambda.id]
  }
  
  tags = var.common_tags
}

# ==========================================
# IAM ROLE FOR BACKUP LAMBDA
# ==========================================

resource "aws_iam_role" "backup_lambda_role" {
  name = "${var.project_name}-backup-lambda-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

resource "aws_iam_role_policy" "backup_lambda_policy" {
  name = "${var.project_name}-backup-lambda-policy-${var.environment}"
  role = aws_iam_role.backup_lambda_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.database_backups.arn,
          "${aws_s3_bucket.database_backups.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = aws_kms_key.backup_encryption.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.db_password_secret_arn
      },
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBSnapshots",
          "rds:CreateDBSnapshot",
          "rds:DeleteDBSnapshot",
          "rds:CopyDBSnapshot"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.backup_alerts.arn
      }
    ]
  })
}

# ==========================================
# SECURITY GROUP FOR BACKUP LAMBDA
# ==========================================

resource "aws_security_group" "backup_lambda" {
  name        = "${var.project_name}-backup-lambda-sg-${var.environment}"
  description = "Security group for backup Lambda functions"
  vpc_id      = var.vpc_id
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.common_tags, {
    Name = "${var.project_name}-backup-lambda-sg"
  })
}

# ==========================================
# SNS TOPIC FOR BACKUP ALERTS
# ==========================================

resource "aws_sns_topic" "backup_alerts" {
  name = "${var.project_name}-backup-alerts-${var.environment}"
  
  tags = var.common_tags
}

resource "aws_sns_topic_subscription" "backup_email" {
  count     = length(var.alert_emails)
  topic_arn = aws_sns_topic.backup_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_emails[count.index]
}

# ==========================================
# CLOUDWATCH ALARMS
# ==========================================

resource "aws_cloudwatch_metric_alarm" "backup_failure" {
  alarm_name          = "${var.project_name}-backup-failure-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 3600
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Triggers when backup Lambda fails"
  
  dimensions = {
    FunctionName = aws_lambda_function.backup_orchestrator.function_name
  }
  
  alarm_actions = [aws_sns_topic.backup_alerts.arn]
  ok_actions    = [aws_sns_topic.backup_alerts.arn]
  
  tags = var.common_tags
}

# ==========================================
# DATA SOURCES
# ==========================================

data "aws_caller_identity" "current" {}

data "archive_file" "backup_lambda" {
  type        = "zip"
  output_path = "${path.module}/lambda/backup-orchestrator.zip"
  
  source {
    content  = file("${path.module}/lambda/backup-orchestrator.js")
    filename = "index.js"
  }
}

data "archive_file" "disaster_recovery_lambda" {
  type        = "zip"
  output_path = "${path.module}/lambda/disaster-recovery.zip"
  
  source {
    content  = file("${path.module}/lambda/disaster-recovery.js")
    filename = "index.js"
  }
}
