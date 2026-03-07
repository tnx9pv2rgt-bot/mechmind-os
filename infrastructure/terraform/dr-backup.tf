# =============================================================================
# MechMind OS v10 - Disaster Recovery & Cross-Region Backup Configuration
# Multi-AZ Failover & Cross-Region Backup Strategy
# =============================================================================

# =============================================================================
# AWS Backup Vault - Primary Region
# =============================================================================

resource "aws_backup_vault" "primary" {
  name        = "${local.name_prefix}-backup-vault"
  kms_key_arn = aws_kms_key.backup_encryption.arn

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backup-vault"
  })
}

# =============================================================================
# AWS Backup Vault - DR Region (eu-west-1)
# =============================================================================

resource "aws_backup_vault" "dr" {
  provider    = aws.dr
  name        = "${local.name_prefix}-dr-backup-vault"
  kms_key_arn = aws_kms_key.backup_encryption_dr.arn

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-dr-backup-vault"
  })
}

# =============================================================================
# KMS Key for Backup Encryption - Primary Region
# =============================================================================

resource "aws_kms_key" "backup_encryption" {
  description             = "KMS key for AWS Backup encryption - ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region            = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow AWS Backup Service"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
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
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backup-kms-key"
  })
}

resource "aws_kms_alias" "backup_encryption" {
  name          = "alias/${local.name_prefix}-backup"
  target_key_id = aws_kms_key.backup_encryption.key_id
}

# =============================================================================
# KMS Key for Backup Encryption - DR Region
# =============================================================================

resource "aws_kms_key" "backup_encryption_dr" {
  provider                = aws.dr
  description             = "KMS key for AWS Backup encryption - DR region"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow AWS Backup Service"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backup-kms-key-dr"
  })
}

resource "aws_kms_alias" "backup_encryption_dr" {
  provider      = aws.dr
  name          = "alias/${local.name_prefix}-backup-dr"
  target_key_id = aws_kms_key.backup_encryption_dr.key_id
}

# =============================================================================
# AWS Backup Plan - Daily with Cross-Region Copy
# =============================================================================

resource "aws_backup_plan" "daily" {
  count = local.is_production ? 1 : 0

  name = "${local.name_prefix}-daily-backup-plan"

  # Daily backup at 02:00 UTC
  rule {
    rule_name         = "${local.name_prefix}-daily-backup"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 2 * * ? *)"
    start_window      = 60    # 1 hour start window
    completion_window = 240   # 4 hours completion window

    # Lifecycle: 30 days warm, then move to cold storage
    lifecycle {
      cold_storage_after = 30  # Move to Glacier after 30 days
      delete_after       = 365 # Delete after 1 year
    }

    # Cross-region copy to DR region
    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn

      lifecycle {
        cold_storage_after = 30
        delete_after       = 365
      }
    }

    # Recovery point tagging
    recovery_point_tags = merge(local.common_tags, {
      BackupType = "automated"
      Retention  = "30-days-warm-1-year-cold"
    })
  }

  # Weekly backup with longer retention
  rule {
    rule_name         = "${local.name_prefix}-weekly-archive"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 3 ? * SUN *)"  # Sundays at 03:00 UTC

    lifecycle {
      cold_storage_after = 30
      delete_after       = 2555  # 7 years retention for compliance
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn

      lifecycle {
        cold_storage_after = 30
        delete_after       = 2555
      }
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "weekly-archive"
      Retention  = "7-years"
    })
  }

  advanced_backup_setting {
    resource_type = "EC2"
    backup_options = {
      WindowsVSS = "enabled"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-daily-backup-plan"
  })
}

# =============================================================================
# AWS Backup Selection - RDS Resources
# =============================================================================

resource "aws_backup_selection" "rds" {
  count = local.is_production ? 1 : 0

  iam_role_arn = aws_iam_role.backup.arn
  name         = "${local.name_prefix}-rds-backup-selection"
  plan_id      = aws_backup_plan.daily[0].id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "BackupPolicy"
    value = "daily"
  }

  # Also backup by resource ARN for explicit selection
  resources = local.use_aurora ? [
    aws_rds_cluster.aurora_serverless[0].arn
  ] : [
    aws_db_instance.postgres_free[0].arn
  ]
}

# =============================================================================
# AWS Backup Selection - S3 Buckets
# =============================================================================

resource "aws_backup_selection" "s3" {
  count = local.is_production ? 1 : 0

  iam_role_arn = aws_iam_role.backup.arn
  name         = "${local.name_prefix}-s3-backup-selection"
  plan_id      = aws_backup_plan.daily[0].id

  resources = [
    aws_s3_bucket.mechmind_storage.arn
  ]
}

# =============================================================================
# IAM Role for AWS Backup
# =============================================================================

resource "aws_iam_role" "backup" {
  name = "${local.name_prefix}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_s3" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Backup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# =============================================================================
# Custom IAM Policy for Backup Operations
# =============================================================================

resource "aws_iam_policy" "backup_operations" {
  name        = "${local.name_prefix}-backup-operations"
  description = "Custom policy for DR backup operations"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBackupOperations"
        Effect = "Allow"
        Action = [
          "backup:StartBackupJob",
          "backup:StartRestoreJob",
          "backup:StopBackupJob",
          "backup:ListBackupJobs",
          "backup:ListRestoreJobs",
          "backup:DescribeRecoveryPoint",
          "backup:GetRecoveryPointRestoreMetadata",
          "backup:ListRecoveryPointsByBackupVault"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowCrossRegionCopy"
        Effect = "Allow"
        Action = [
          "backup:CopyIntoBackupVault"
        ]
        Resource = aws_backup_vault.dr.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_operations" {
  role       = aws_iam_role.backup.name
  policy_arn = aws_iam_policy.backup_operations.arn
}

# =============================================================================
# S3 Cross-Region Replication - DR Bucket
# =============================================================================

resource "aws_s3_bucket" "dr_replication" {
  count    = local.is_production ? 1 : 0
  provider = aws.dr

  bucket = "${local.name_prefix}-storage-dr-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-storage-dr"
  })
}

resource "aws_s3_bucket_ownership_controls" "dr_replication" {
  count    = local.is_production ? 1 : 0
  provider = aws.dr

  bucket = aws_s3_bucket.dr_replication[0].id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "dr_replication" {
  count    = local.is_production ? 1 : 0
  provider = aws.dr

  bucket = aws_s3_bucket.dr_replication[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dr_replication" {
  count    = local.is_production ? 1 : 0
  provider = aws.dr

  bucket = aws_s3_bucket.dr_replication[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "dr_replication" {
  count    = local.is_production ? 1 : 0
  provider = aws.dr

  bucket = aws_s3_bucket.dr_replication[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

# =============================================================================
# S3 Replication Configuration
# =============================================================================

resource "aws_iam_role" "replication" {
  count = local.is_production ? 1 : 0

  name = "${local.name_prefix}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_policy" "replication" {
  count = local.is_production ? 1 : 0

  name = "${local.name_prefix}-s3-replication-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSourceBucket"
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersion",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging",
          "s3:GetObjectRetention",
          "s3:GetObjectLegalHold",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.mechmind_storage.arn,
          "${aws_s3_bucket.mechmind_storage.arn}/*"
        ]
      },
      {
        Sid    = "AllowDestinationBucket"
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags",
          "s3:GetObjectVersionTagging",
          "s3:ObjectOwnerOverrideToBucketOwner"
        ]
        Resource = "${aws_s3_bucket.dr_replication[0].arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "replication" {
  count = local.is_production ? 1 : 0

  role       = aws_iam_role.replication[0].name
  policy_arn = aws_iam_policy.replication[0].arn
}

resource "aws_s3_bucket_replication_configuration" "main" {
  count = local.is_production ? 1 : 0

  bucket = aws_s3_bucket.mechmind_storage.id
  role   = aws_iam_role.replication[0].arn

  rule {
    id     = "replicate-to-dr"
    status = "Enabled"
    priority = 1

    delete_marker_replication {
      status = "Enabled"
    }

    destination {
      bucket = aws_s3_bucket.dr_replication[0].arn

      replication_time {
        status  = "Enabled"
        minutes = 15
      }

      metrics {
        status  = "Enabled"
        minutes = 15
      }

      access_control_translation {
        owner = "Destination"
      }

      account = local.account_id
    }

    filter {
      prefix = ""  # Replicate all objects
    }
  }

  depends_on = [aws_s3_bucket_versioning.mechmind_storage]
}

# =============================================================================
# DynamoDB Global Tables (for session/state if needed)
# =============================================================================

resource "aws_dynamodb_global_table" "terraform_locks_dr" {
  count = var.environment == "prod" ? 1 : 0

  name = "mechmind-terraform-locks"

  replica {
    region_name = var.aws_region
  }

  replica {
    region_name = var.dr_region
  }
}

# =============================================================================
# Backup Vault Lock (Compliance Protection)
# =============================================================================

resource "aws_backup_vault_lock_configuration" "primary" {
  count = local.is_production ? 1 : 0

  backup_vault_name   = aws_backup_vault.primary.name
  min_retention_days  = 7
  max_retention_days  = 365
  changeable_for_days = 3  # Compliance period where changes allowed
}

resource "aws_backup_vault_lock_configuration" "dr" {
  count = local.is_production ? 1 : 0
  provider = aws.dr

  backup_vault_name   = aws_backup_vault.dr.name
  min_retention_days  = 7
  max_retention_days  = 365
  changeable_for_days = 3
}

# =============================================================================
# Backup Notifications
# =============================================================================

resource "aws_backup_vault_notifications" "primary" {
  count = local.is_production ? 1 : 0

  backup_vault_name   = aws_backup_vault.primary.name
  sns_topic_arn       = aws_sns_topic.alerts[0].arn
  backup_vault_events = [
    "BACKUP_JOB_STARTED",
    "BACKUP_JOB_COMPLETED",
    "BACKUP_JOB_FAILED",
    "RESTORE_JOB_STARTED",
    "RESTORE_JOB_COMPLETED",
    "RESTORE_JOB_FAILED",
    "COPY_JOB_STARTED",
    "COPY_JOB_COMPLETED",
    "COPY_JOB_FAILED"
  ]
}

# =============================================================================
# CloudWatch Alarms for Backup Failures
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "backup_job_failed" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-backup-job-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when backup job fails"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts[0].arn]
  ok_actions    = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "copy_job_failed" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-copy-job-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfCopyJobsFailed"
  namespace           = "AWS/Backup"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when cross-region copy job fails"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# Outputs
# =============================================================================

output "backup_vault_arn" {
  description = "Primary backup vault ARN"
  value       = aws_backup_vault.primary.arn
}

output "backup_vault_dr_arn" {
  description = "DR region backup vault ARN"
  value       = aws_backup_vault.dr.arn
}

output "backup_plan_id" {
  description = "Backup plan ID"
  value       = local.is_production ? aws_backup_plan.daily[0].id : null
}

output "dr_s3_bucket_arn" {
  description = "DR region S3 bucket ARN"
  value       = local.is_production ? aws_s3_bucket.dr_replication[0].arn : null
}

output "backup_kms_key_id" {
  description = "KMS key ID for backup encryption"
  value       = aws_kms_key.backup_encryption.id
}
