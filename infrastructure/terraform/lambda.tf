# =============================================================================
# MechMind OS v10 - Lambda Functions Configuration
# Cost-Optimized: ARM64 (Graviton2) for 20% cost savings
# =============================================================================

# =============================================================================
# Lambda Layer for Dependencies (optional optimization)
# =============================================================================

# Lambda Layer for common dependencies (can be built separately)
# resource "aws_lambda_layer_version" "common_deps" {
#   layer_name = "${local.name_prefix}-common-deps"
#   filename   = "../lambda-layers/common-deps.zip"
#   
#   compatible_runtimes = [var.lambda_runtime]
#   compatible_architectures = [var.lambda_architecture]
# 
#   source_code_hash = filebase64sha256("../lambda-layers/common-deps.zip")
# }

# =============================================================================
# Main API Lambda Function (NestJS Adapter)
# =============================================================================

resource "aws_lambda_function" "api_main" {
  function_name = "${local.name_prefix}-api-main"
  description   = "MechMind Main API - NestJS on Lambda"

  # Runtime configuration
  runtime       = var.lambda_runtime
  handler       = "dist/lambda.handler"  # NestJS Lambda adapter entry point
  architectures = [var.lambda_architecture]

  # Memory and timeout
  memory_size = var.lambda_memory_size
  timeout     = var.lambda_timeout

  # Reserved concurrency (unlimited for dev, limit for prod to control costs)
  reserved_concurrent_executions = local.is_production ? var.lambda_reserved_concurrent_executions : 10

  # IAM role
  role = aws_iam_role.lambda_execution.arn

  # VPC configuration (for database access)
  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Environment variables
  environment {
    variables = {
      NODE_ENV              = var.environment
      DB_HOST               = local.use_aurora ? aws_rds_cluster.aurora_serverless[0].endpoint : aws_db_instance.postgres_free[0].address
      DB_PORT               = "5432"
      DB_NAME               = var.db_name
      DB_SECRET_ARN         = aws_secretsmanager_secret.db_credentials.arn
      JWT_SECRET_ARN        = aws_secretsmanager_secret.jwt_secret.arn
      VAPI_KEY_ARN          = aws_secretsmanager_secret.vapi_key.arn
      SQS_BOOKING_QUEUE_URL = aws_sqs_queue.booking_confirmations.url
      SQS_NOTIFY_QUEUE_URL  = aws_sqs_queue.notifications.url
      S3_BUCKET_NAME        = aws_s3_bucket.mechmind_storage.id
      LOG_LEVEL             = var.environment == "prod" ? "info" : "debug"
    }
  }

  # Logging configuration
  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.lambda_api.name
  }

  # Code deployment (placeholder - actual deployment via CI/CD)
  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda-placeholder.zip")

  # Dead letter queue
  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  # Tracing (optional - X-Ray costs extra)
  # tracing_config {
  #   mode = "Active"
  # }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-api-main"
    Type = "api"
  })

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment[0].variables["DEPLOYMENT_TIMESTAMP"]
    ]
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_api,
    aws_iam_role_policy_attachment.lambda_basic_execution
  ]
}

# Lambda Function URL (public API endpoint)
resource "aws_lambda_function_url" "api_public" {
  function_name      = aws_lambda_function.api_main.function_name
  authorization_type = "AWS_IAM"  # Use IAM auth, can also use "NONE" for public

  cors {
    allow_credentials = true
    allow_origins     = var.environment == "prod" ? ["https://app.mechmind.io"] : ["*"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    allow_headers     = ["content-type", "authorization", "x-request-id"]
    max_age           = 86400
  }
}

# =============================================================================
# Booking Worker Lambda (SQS Consumer)
# =============================================================================

resource "aws_lambda_function" "worker_booking" {
  function_name = "${local.name_prefix}-worker-booking"
  description   = "MechMind Booking Worker - Processes booking confirmations"

  runtime       = var.lambda_runtime
  handler       = "dist/workers/booking.handler"
  architectures = [var.lambda_architecture]

  memory_size = 256  # Lower memory for worker (cheaper)
  timeout     = 60   # Longer timeout for processing

  role = aws_iam_role.lambda_execution.arn

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV       = var.environment
      DB_HOST        = local.use_aurora ? aws_rds_cluster.aurora_serverless[0].endpoint : aws_db_instance.postgres_free[0].address
      DB_SECRET_ARN  = aws_secretsmanager_secret.db_credentials.arn
      VAPI_KEY_ARN   = aws_secretsmanager_secret.vapi_key.arn
      LOG_LEVEL      = var.environment == "prod" ? "info" : "debug"
    }
  }

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.lambda_worker.name
  }

  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda-placeholder.zip")

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-worker-booking"
    Type = "worker"
  })

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }

  depends_on = [aws_cloudwatch_log_group.lambda_worker]
}

# SQS Trigger for Booking Worker
resource "aws_lambda_event_source_mapping" "booking_sqs_trigger" {
  event_source_arn = aws_sqs_queue.booking_confirmations.arn
  function_name    = aws_lambda_function.worker_booking.arn
  batch_size       = 10
  enabled          = true

  function_response_types = ["ReportBatchItemFailures"]
}

# =============================================================================
# Notification Worker Lambda (SQS Consumer)
# =============================================================================

resource "aws_lambda_function" "worker_notification" {
  function_name = "${local.name_prefix}-worker-notification"
  description   = "MechMind Notification Worker - Sends SMS/Email notifications"

  runtime       = var.lambda_runtime
  handler       = "dist/workers/notification.handler"
  architectures = [var.lambda_architecture]

  memory_size = 256
  timeout     = 30

  role = aws_iam_role.lambda_execution.arn

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV      = var.environment
      DB_HOST       = local.use_aurora ? aws_rds_cluster.aurora_serverless[0].endpoint : aws_db_instance.postgres_free[0].address
      DB_SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
      LOG_LEVEL     = var.environment == "prod" ? "info" : "debug"
    }
  }

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.lambda_notification.name
  }

  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda-placeholder.zip")

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-worker-notification"
    Type = "worker"
  })

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }

  depends_on = [aws_cloudwatch_log_group.lambda_notification]
}

# SQS Trigger for Notification Worker
resource "aws_lambda_event_source_mapping" "notification_sqs_trigger" {
  event_source_arn = aws_sqs_queue.notifications.arn
  function_name    = aws_lambda_function.worker_notification.arn
  batch_size       = 10
  enabled          = true

  function_response_types = ["ReportBatchItemFailures"]
}

# =============================================================================
# Voice Handler Lambda (Vapi.ai Webhook Handler)
# =============================================================================

resource "aws_lambda_function" "voice_handler" {
  function_name = "${local.name_prefix}-voice-handler"
  description   = "MechMind Voice Handler - Vapi.ai webhook processor"

  runtime       = var.lambda_runtime
  handler       = "dist/voice/handler.handler"
  architectures = [var.lambda_architecture]

  memory_size = 512  # Higher memory for voice processing
  timeout     = 30

  role = aws_iam_role.lambda_execution.arn

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV      = var.environment
      DB_HOST       = local.use_aurora ? aws_rds_cluster.aurora_serverless[0].endpoint : aws_db_instance.postgres_free[0].address
      DB_SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
      VAPI_KEY_ARN  = aws_secretsmanager_secret.vapi_key.arn
      LOG_LEVEL     = var.environment == "prod" ? "info" : "debug"
    }
  }

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.lambda_voice.name
  }

  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda-placeholder.zip")

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-voice-handler"
    Type = "voice"
  })

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }

  depends_on = [aws_cloudwatch_log_group.lambda_voice]
}

# Lambda Function URL for Voice Webhooks (public)
resource "aws_lambda_function_url" "voice_public" {
  function_name      = aws_lambda_function.voice_handler.function_name
  authorization_type = "NONE"  # Public for Vapi.ai webhooks

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["POST", "OPTIONS"]
    allow_headers     = ["content-type", "authorization"]
    max_age           = 86400
  }
}

# =============================================================================
# Lambda Placeholder (for initial deployment)
# =============================================================================

# Create a minimal placeholder zip for initial Terraform apply
resource "local_file" "lambda_placeholder" {
  content  = "placeholder"
  filename = "${path.module}/lambda-placeholder.txt"
}

# Note: In CI/CD, the actual Lambda deployment will use:
# aws lambda update-function-code --function-name <name> --zip-file fileb://dist/lambda.zip

# =============================================================================
# Lambda Provisioned Concurrency (optional - for production)
# =============================================================================

# Uncomment for production to reduce cold starts
# resource "aws_lambda_provisioned_concurrency_config" "api_main" {
#   count = local.is_production ? 1 : 0
# 
#   function_name                     = aws_lambda_function.api_main.function_name
#   provisioned_concurrent_executions = 2
#   qualifier                         = aws_lambda_function.api_main.version
# }
