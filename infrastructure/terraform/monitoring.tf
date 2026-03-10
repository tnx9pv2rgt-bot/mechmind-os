# =============================================================================
# MechMind OS v10 - CloudWatch Monitoring & Alerting
# Cost-Optimized: Free tier metrics + essential alarms only
# =============================================================================

# =============================================================================
# CloudWatch Log Groups
# =============================================================================

resource "aws_cloudwatch_log_group" "lambda_api" {
  name              = "/aws/lambda/${local.name_prefix}-api-main"
  retention_in_days = var.lambda_log_retention_days
  kms_key_id        = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-api-logs"
  })
}

resource "aws_cloudwatch_log_group" "lambda_worker" {
  name              = "/aws/lambda/${local.name_prefix}-worker-booking"
  retention_in_days = var.lambda_log_retention_days
  kms_key_id        = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-worker-logs"
  })
}

resource "aws_cloudwatch_log_group" "lambda_notification" {
  name              = "/aws/lambda/${local.name_prefix}-worker-notification"
  retention_in_days = var.lambda_log_retention_days
  kms_key_id        = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-notification-logs"
  })
}

resource "aws_cloudwatch_log_group" "lambda_voice" {
  name              = "/aws/lambda/${local.name_prefix}-voice-handler"
  retention_in_days = var.lambda_log_retention_days
  kms_key_id        = local.is_production ? aws_kms_key.mechmind_secrets[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-voice-logs"
  })
}

# =============================================================================
# SNS Topic for Alerts
# =============================================================================

resource "aws_sns_topic" "alerts" {
  count = local.is_production ? 1 : 0

  name = "${local.name_prefix}-alerts"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alerts"
  })
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count = local.is_production ? 1 : 0

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# =============================================================================
# Lambda Alarms
# =============================================================================

# Lambda Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when Lambda errors exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api_main.function_name
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]
  ok_actions    = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# Lambda Duration Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-lambda-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 20000  # 20 seconds
  alarm_description   = "Alert when Lambda duration exceeds threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api_main.function_name
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# Lambda Throttles Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when Lambda is throttled"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api_main.function_name
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# RDS Alarms
# =============================================================================

# RDS CPU Utilization
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when RDS CPU exceeds 80%"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# RDS Free Storage Space
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2147483648  # 2GB in bytes
  alarm_description   = "Alert when RDS free storage is low"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# RDS Connection Count
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when RDS connections are high"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# SQS Alarms
# =============================================================================

# SQS Approximate Age of Oldest Message
resource "aws_cloudwatch_metric_alarm" "sqs_age" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-sqs-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 300  # 5 minutes
  alarm_description   = "Alert when SQS messages are stuck"

  dimensions = {
    QueueName = aws_sqs_queue.booking_confirmations.name
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# Custom Dashboard
# =============================================================================

resource "aws_cloudwatch_dashboard" "mechmind" {
  count = local.is_production ? 1 : 0

  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Invocations"
          region = local.region
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.api_main.function_name, { stat = "Sum", period = 300 }],
            ["...", aws_lambda_function.worker_booking.function_name, { stat = "Sum", period = 300 }],
            ["...", aws_lambda_function.worker_notification.function_name, { stat = "Sum", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Errors"
          region = local.region
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.api_main.function_name, { stat = "Sum", period = 300 }],
            ["...", aws_lambda_function.worker_booking.function_name, { stat = "Sum", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "RDS CPU & Connections"
          region = local.region
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id, { stat = "Average", period = 300 }],
            [".", "DatabaseConnections", ".", ".", { stat = "Average", period = 300, yAxis = "right" }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "SQS Messages"
          region = local.region
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", aws_sqs_queue.booking_confirmations.name, { stat = "Average", period = 300 }],
            ["...", aws_sqs_queue.notifications.name, { stat = "Average", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          title  = "Recent Lambda Errors"
          region = local.region
          query  = "SOURCE '/aws/lambda/${aws_lambda_function.api_main.function_name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
        }
      }
    ]
  })
}

# =============================================================================
# AWS Budget (Cost Monitoring)
# =============================================================================

resource "aws_budgets_budget" "mechmind_monthly" {
  name              = "${local.name_prefix}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_amount
  limit_unit        = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "user:Project$MechMind-OS",
      "user:Environment$${var.environment}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = var.monthly_budget_alert_threshold
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alarm_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alarm_email]
  }

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Log Insights Queries (saved)
# =============================================================================

resource "aws_cloudwatch_query_definition" "lambda_errors" {
  count = local.is_production ? 1 : 0

  name = "${local.name_prefix}/lambda-errors"

  log_group_names = [
    aws_cloudwatch_log_group.lambda_api.name,
    aws_cloudwatch_log_group.lambda_worker.name
  ]

  query_string = <<-EOT
    fields @timestamp, @message, @logStream
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 100
  EOT
}

resource "aws_cloudwatch_query_definition" "api_requests" {
  count = local.is_production ? 1 : 0

  name = "${local.name_prefix}/api-requests"

  log_group_names = [
    aws_cloudwatch_log_group.lambda_api.name
  ]

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /REQUEST/
    | parse @message "* * * * * *" as method, path, status, duration, userId, shopId
    | stats count(*) as requests, avg(duration) as avg_duration by path, status
    | sort requests desc
  EOT
}

# =============================================================================
# CloudWatch Alarms Anomaly Detection (optional - costs extra)
# =============================================================================

# resource "aws_cloudwatch_metric_alarm" "lambda_invocations_anomaly" {
#   count = local.is_production ? 1 : 0
#
#   alarm_name          = "${local.name_prefix}-lambda-invocations-anomaly"
#   comparison_operator = "GreaterThanUpperThreshold"
#   evaluation_periods  = 2
#
#   metric_query {
#     id          = "m1"
#     return_data = true
#     metric {
#       metric_name = "Invocations"
#       namespace   = "AWS/Lambda"
#       period      = 300
#       stat        = "Sum"
#       dimensions = {
#         FunctionName = aws_lambda_function.api_main.function_name
#       }
#     }
#   }
#
#   metric_query {
#     id          = "ad1"
#     expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
#     label       = "Invocations (expected)"
#     return_data = true
#   }
#
#   threshold_metric_id = "ad1"
#   alarm_actions       = [aws_sns_topic.alerts[0].arn]
#
#   tags = local.common_tags
# }
