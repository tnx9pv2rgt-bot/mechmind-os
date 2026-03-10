# =============================================================================
# MechMind OS v10 - Secrets Manager Configuration
# Secure credential storage for all services
# =============================================================================

# =============================================================================
# KMS Key for Secret Encryption (optional but recommended)
# =============================================================================

resource "aws_kms_key" "mechmind_secrets" {
  count = local.is_production ? 1 : 0

  description             = "KMS key for MechMind secrets encryption"
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
        Sid    = "Allow Lambda Decrypt"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution.arn
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow RDS Decrypt"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-secrets-key"
  })
}

resource "aws_kms_alias" "mechmind_secrets" {
  count = local.is_production ? 1 : 0

  name          = "alias/mechmind-${var.environment}-secrets"
  target_key_id = aws_kms_key.mechmind_secrets[0].key_id
}

# =============================================================================
# Database Credentials Secret
# =============================================================================

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.name_prefix}/database/credentials"
  description = "Database credentials for MechMind ${var.environment}"

  # Use KMS key in production, AWS managed key in dev
  kms_key_id = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-credentials"
    Type = "database"
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = local.use_aurora ? aws_rds_cluster.aurora_serverless[0].endpoint : aws_db_instance.postgres_free[0].address
    port     = 5432
    dbname   = var.db_name
    engine   = "postgres"
  })

  depends_on = [
    aws_db_instance.postgres_free,
    aws_rds_cluster.aurora_serverless
  ]
}

# =============================================================================
# Vapi.ai API Key Secret
# =============================================================================

resource "aws_secretsmanager_secret" "vapi_key" {
  name        = "${local.name_prefix}/vapi/api-key"
  description = "Vapi.ai API key for voice calls"

  kms_key_id = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vapi-key"
    Type = "api-key"
  })
}

# Placeholder version - actual key should be set manually or via CI/CD
resource "aws_secretsmanager_secret_version" "vapi_key" {
  secret_id = aws_secretsmanager_secret.vapi_key.id
  secret_string = jsonencode({
    api_key = "REPLACE_WITH_ACTUAL_VAPI_KEY"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# =============================================================================
# Twilio Credentials Secret
# =============================================================================

resource "aws_secretsmanager_secret" "twilio" {
  name        = "${local.name_prefix}/twilio/credentials"
  description = "Twilio credentials for SMS and PSTN calls"

  kms_key_id = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-twilio-credentials"
    Type = "api-key"
  })
}

resource "aws_secretsmanager_secret_version" "twilio" {
  secret_id = aws_secretsmanager_secret.twilio.id
  secret_string = jsonencode({
    account_sid = "REPLACE_WITH_TWILIO_ACCOUNT_SID"
    auth_token  = "REPLACE_WITH_TWILIO_AUTH_TOKEN"
    phone_number = "REPLACE_WITH_TWILIO_PHONE_NUMBER"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# =============================================================================
# JWT Signing Key Secret
# =============================================================================

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${local.name_prefix}/auth/jwt-signing-key"
  description = "JWT signing key for authentication"

  kms_key_id = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-jwt-secret"
    Type = "auth"
  })
}

resource "random_password" "jwt_signing_key" {
  length           = 64
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({
    signing_key = random_password.jwt_signing_key.result
    algorithm   = "HS256"
  })
}

# =============================================================================
# Auth0 Credentials Secret
# =============================================================================

resource "aws_secretsmanager_secret" "auth0" {
  name        = "${local.name_prefix}/auth0/credentials"
  description = "Auth0 credentials for authentication"

  kms_key_id = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-auth0-credentials"
    Type = "auth"
  })
}

resource "aws_secretsmanager_secret_version" "auth0" {
  secret_id = aws_secretsmanager_secret.auth0.id
  secret_string = jsonencode({
    domain        = "REPLACE_WITH_AUTH0_DOMAIN"
    client_id     = "REPLACE_WITH_AUTH0_CLIENT_ID"
    client_secret = "REPLACE_WITH_AUTH0_CLIENT_SECRET"
    audience      = "REPLACE_WITH_AUTH0_AUDIENCE"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# =============================================================================
# Stripe API Keys Secret (for payments)
# =============================================================================

resource "aws_secretsmanager_secret" "stripe" {
  count = var.environment == "prod" ? 1 : 0

  name        = "${local.name_prefix}/stripe/api-keys"
  description = "Stripe API keys for payment processing"

  kms_key_id = aws_kms_key.mechmind_secrets[0].arn

  recovery_window_in_days = 30

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-stripe-keys"
    Type = "payment"
  })
}

resource "aws_secretsmanager_secret_version" "stripe" {
  count = var.environment == "prod" ? 1 : 0

  secret_id = aws_secretsmanager_secret.stripe[0].id
  secret_string = jsonencode({
    publishable_key = "REPLACE_WITH_STRIPE_PUBLISHABLE_KEY"
    secret_key      = "REPLACE_WITH_STRIPE_SECRET_KEY"
    webhook_secret  = "REPLACE_WITH_STRIPE_WEBHOOK_SECRET"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# =============================================================================
# OpenAI API Key Secret (for AI features)
# =============================================================================

resource "aws_secretsmanager_secret" "openai" {
  name        = "${local.name_prefix}/openai/api-key"
  description = "OpenAI API key for AI features"

  kms_key_id = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-openai-key"
    Type = "api-key"
  })
}

resource "aws_secretsmanager_secret_version" "openai" {
  secret_id = aws_secretsmanager_secret.openai.id
  secret_string = jsonencode({
    api_key = "REPLACE_WITH_OPENAI_API_KEY"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# =============================================================================
# Application Configuration Secret
# =============================================================================

resource "aws_secretsmanager_secret" "app_config" {
  name        = "${local.name_prefix}/app/config"
  description = "Application configuration for MechMind"

  kms_key_id = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-config"
    Type = "config"
  })
}

resource "aws_secretsmanager_secret_version" "app_config" {
  secret_id = aws_secretsmanager_secret.app_config.id
  secret_string = jsonencode({
    environment                    = var.environment
    log_level                      = var.environment == "prod" ? "info" : "debug"
    enable_detailed_logging        = var.environment != "prod"
    max_booking_advance_days       = 90
    default_appointment_duration   = 60
    notification_email_from        = "noreply@mechmind.io"
    support_email                  = "support@mechmind.io"
    booking_confirmation_template  = "booking_confirmation_v1"
    appointment_reminder_hours     = [24, 2]
  })
}

# =============================================================================
# Secret Rotation Lambda (for database credentials)
# =============================================================================

# Uncomment to enable automatic rotation
# resource "aws_lambda_function" "secret_rotation" {
#   count = local.is_production ? 1 : 0
#
#   function_name = "${local.name_prefix}-secret-rotation"
#   runtime       = "python3.11"
#   handler       = "lambda_function.lambda_handler"
#   timeout       = 60
#
#   filename         = "${path.module}/secret-rotation-lambda.zip"
#   source_code_hash = filebase64sha256("${path.module}/secret-rotation-lambda.zip")
#
#   role = aws_iam_role.secret_rotation[0].arn
#
#   vpc_config {
#     subnet_ids         = aws_subnet.private[*].id
#     security_group_ids = [aws_security_group.lambda.id]
#   }
#
#   tags = local.common_tags
# }
#
# resource "aws_iam_role" "secret_rotation" {
#   count = local.is_production ? 1 : 0
#
#   name = "${local.name_prefix}-secret-rotation-role"
#
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "lambda.amazonaws.com"
#         }
#       }
#     ]
#   })
#
#   tags = local.common_tags
# }

# =============================================================================
# IAM Policy for Secret Access (additional permissions)
# =============================================================================

resource "aws_iam_policy" "secret_access" {
  name        = "${local.name_prefix}-secret-access"
  description = "Policy for accessing MechMind secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSecretRead"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.vapi_key.arn,
          aws_secretsmanager_secret.twilio.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.auth0.arn,
          aws_secretsmanager_secret.openai.arn,
          aws_secretsmanager_secret.app_config.arn
        ]
      },
      {
        Sid    = "AllowKMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = local.is_production ? [aws_kms_key.mechmind_secrets[0].arn] : ["*"]
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_secret_access" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = aws_iam_policy.secret_access.arn
}
