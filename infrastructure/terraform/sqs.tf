# =============================================================================
# MechMind OS v10 - SQS Queue Configuration
# Cost-Optimized: Free tier 1M requests/month
# =============================================================================

# =============================================================================
# Dead Letter Queue (DLQ) - Shared across all queues
# =============================================================================

resource "aws_sqs_queue" "dlq" {
  name = "${local.name_prefix}-dlq"

  # Message retention (14 days max)
  message_retention_seconds = 1209600

  # Visibility timeout (not applicable for DLQ but required)
  visibility_timeout_seconds = 30

  # Server-side encryption
  kms_master_key_id                 = "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-dlq"
    Type = "dead-letter"
  })
}

# =============================================================================
# Booking Confirmations Queue
# =============================================================================

resource "aws_sqs_queue" "booking_confirmations" {
  name = "${local.name_prefix}-booking-confirmations"

  # Visibility timeout should be >= Lambda timeout
  visibility_timeout_seconds = var.sqs_visibility_timeout

  # Message retention (24 hours default)
  message_retention_seconds = var.sqs_message_retention

  # Delivery delay (0 for immediate processing)
  delay_seconds = 0

  # Maximum message size (256 KB)
  max_message_size = 262144

  # Message retention period for failed messages
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.sqs_dlq_max_receive_count
  })

  # Server-side encryption
  kms_master_key_id                 = "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  # FIFO queue (optional - uncomment if ordering is required)
  # fifo_queue                  = true
  # content_based_deduplication = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-booking-confirmations"
    Type = "main"
  })
}

# =============================================================================
# Notifications Queue (SMS/Email)
# =============================================================================

resource "aws_sqs_queue" "notifications" {
  name = "${local.name_prefix}-notifications"

  visibility_timeout_seconds = 180
  message_retention_seconds  = var.sqs_message_retention
  delay_seconds              = 0
  max_message_size           = 262144

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.sqs_dlq_max_receive_count
  })

  kms_master_key_id                 = "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-notifications"
    Type = "main"
  })
}

# =============================================================================
# Voice Call Queue (for async voice processing)
# =============================================================================

resource "aws_sqs_queue" "voice_calls" {
  name = "${local.name_prefix}-voice-calls"

  visibility_timeout_seconds = 300
  message_retention_seconds  = var.sqs_message_retention
  delay_seconds              = 0
  max_message_size           = 262144

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.sqs_dlq_max_receive_count
  })

  kms_master_key_id                 = "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-voice-calls"
    Type = "main"
  })
}

# =============================================================================
# Scheduled Jobs Queue (for cron-like jobs)
# =============================================================================

resource "aws_sqs_queue" "scheduled_jobs" {
  name = "${local.name_prefix}-scheduled-jobs"

  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400
  delay_seconds              = 0
  max_message_size           = 262144

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  kms_master_key_id                 = "alias/aws/sqs"
  kms_data_key_reuse_period_seconds = 300

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-scheduled-jobs"
    Type = "scheduled"
  })
}

# =============================================================================
# Queue Policies (for cross-account access if needed)
# =============================================================================

resource "aws_sqs_queue_policy" "booking_confirmations" {
  queue_url = aws_sqs_queue.booking_confirmations.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaSendMessage"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution.arn
        }
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.booking_confirmations.arn
      },
      {
        Sid    = "AllowLambdaConsume"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution.arn
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.booking_confirmations.arn
      }
    ]
  })
}

resource "aws_sqs_queue_policy" "notifications" {
  queue_url = aws_sqs_queue.notifications.id

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
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.notifications.arn
      }
    ]
  })
}

# =============================================================================
# CloudWatch Alarms for SQS
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-sqs-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Alert when messages appear in DLQ"

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "sqs_booking_age" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-sqs-booking-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 300  # 5 minutes
  alarm_description   = "Alert when booking messages are stuck"

  dimensions = {
    QueueName = aws_sqs_queue.booking_confirmations.name
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# EventBridge Rule for Scheduled Jobs (optional)
# =============================================================================

# Example: Daily job to send reminders
# resource "aws_cloudwatch_event_rule" "daily_reminders" {
#   name                = "${local.name_prefix}-daily-reminders"
#   description         = "Trigger daily reminder job"
#   schedule_expression = "cron(0 9 * * ? *)"  # 9 AM UTC daily
# }
#
# resource "aws_cloudwatch_event_target" "daily_reminders" {
#   rule      = aws_cloudwatch_event_rule.daily_reminders.name
#   target_id = "SendToSQS"
#   arn       = aws_sqs_queue.scheduled_jobs.arn
#   sqs_target {
#     message_group_id = "daily-reminders"
#   }
# }
#
# resource "aws_sqs_queue_policy" "scheduled_jobs" {
#   queue_url = aws_sqs_queue.scheduled_jobs.id
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "AllowEventBridgeSendMessage"
#         Effect = "Allow"
#         Principal = {
#           Service = "events.amazonaws.com"
#         }
#         Action   = "sqs:SendMessage"
#         Resource = aws_sqs_queue.scheduled_jobs.arn
#       }
#     ]
#   })
# }
