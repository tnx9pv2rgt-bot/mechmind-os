# =============================================================================
# MechMind OS v10 - S3 Storage Configuration
# Cost-Optimized: Intelligent-Tiering + Lifecycle Policies
# =============================================================================

# =============================================================================
# Main Storage Bucket
# =============================================================================

resource "aws_s3_bucket" "mechmind_storage" {
  bucket = "${local.name_prefix}-storage-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-storage"
  })
}

# =============================================================================
# Bucket Ownership Controls
# =============================================================================

resource "aws_s3_bucket_ownership_controls" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# =============================================================================
# Public Access Block (secure by default)
# =============================================================================

resource "aws_s3_bucket_public_access_block" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =============================================================================
# Bucket Versioning
# =============================================================================

resource "aws_s3_bucket_versioning" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id

  versioning_configuration {
    status = var.s3_versioning ? "Enabled" : "Disabled"
  }
}

# =============================================================================
# Server-Side Encryption (SSE-S3)
# =============================================================================

resource "aws_s3_bucket_server_side_encryption_configuration" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true  # Reduces KMS costs
  }
}

# =============================================================================
# Intelligent-Tiering Configuration
# Automatically moves objects between access tiers
# =============================================================================

resource "aws_s3_bucket_intelligent_tiering_configuration" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id
  name   = "MechMindIntelligentTiering"

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = var.s3_glacier_days
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = var.s3_deep_archive_days
  }
}

# =============================================================================
# Lifecycle Rules for Cost Optimization
# =============================================================================

resource "aws_s3_bucket_lifecycle_configuration" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id

  rule {
    id     = "transition-to-intelligent-tiering"
    status = "Enabled"

    transition {
      days          = 0
      storage_class = "INTELLIGENT_TIERING"
    }
  }

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "cleanup-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }

  rule {
    id     = "cleanup-logs"
    status = "Enabled"

    filter {
      prefix = "logs/"
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# =============================================================================
# Bucket Policy (for Lambda access)
# =============================================================================

resource "aws_s3_bucket_policy" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution.arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.mechmind_storage.arn,
          "${aws_s3_bucket.mechmind_storage.arn}/*"
        ]
      },
      {
        Sid       = "DenyInsecureConnections"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.mechmind_storage.arn,
          "${aws_s3_bucket.mechmind_storage.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.mechmind_storage]
}

# =============================================================================
# CORS Configuration (for frontend uploads)
# =============================================================================

resource "aws_s3_bucket_cors_configuration" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.environment == "prod" ? ["https://app.mechmind.io", "https://admin.mechmind.io"] : ["*"]
    expose_headers  = ["ETag", "x-amz-server-side-encryption"]
    max_age_seconds = 3000
  }
}

# =============================================================================
# Bucket Metrics (for monitoring)
# =============================================================================

resource "aws_s3_bucket_metric" "mechmind_storage" {
  bucket = aws_s3_bucket.mechmind_storage.id
  name   = "EntireBucket"
}

# =============================================================================
# Logging Bucket (optional - for access logs)
# =============================================================================

resource "aws_s3_bucket" "logs" {
  count = local.is_production ? 1 : 0

  bucket = "${local.name_prefix}-logs-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-logs"
  })
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  count = local.is_production ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  count = local.is_production ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  count = local.is_production ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count = local.is_production ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  rule {
    id     = "archive-logs"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# =============================================================================
# S3 Bucket for Terraform State (if not using external backend)
# =============================================================================

resource "aws_s3_bucket" "terraform_state" {
  count = var.environment == "prod" ? 1 : 0

  bucket = "mechmind-terraform-state-${local.account_id}"

  tags = merge(local.common_tags, {
    Name = "mechmind-terraform-state"
  })
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  count = var.environment == "prod" ? 1 : 0

  bucket = aws_s3_bucket.terraform_state[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  count = var.environment == "prod" ? 1 : 0

  bucket = aws_s3_bucket.terraform_state[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = "alias/aws/s3"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  count = var.environment == "prod" ? 1 : 0

  bucket = aws_s3_bucket.terraform_state[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for Terraform state locking
resource "aws_dynamodb_table" "terraform_locks" {
  count = var.environment == "prod" ? 1 : 0

  name         = "mechmind-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"  # On-demand for cost savings
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = merge(local.common_tags, {
    Name = "mechmind-terraform-locks"
  })
}

# =============================================================================
# S3 Inventory (optional - for compliance)
# =============================================================================

# resource "aws_s3_bucket_inventory" "mechmind_storage" {
#   bucket = aws_s3_bucket.mechmind_storage.id
#   name   = "EntireBucketWeekly"
#
#   included_object_versions = "Current"
#
#   schedule {
#     frequency = "Weekly"
#   }
#
#   destination {
#     bucket {
#       format     = "CSV"
#       bucket_arn = aws_s3_bucket.logs[0].arn
#     }
#   }
# }
