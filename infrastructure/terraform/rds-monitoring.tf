# =============================================================================
# MechMind OS v10 - RDS Monitoring & Failover Detection
# Multi-AZ Health Monitoring & Automated Recovery Notifications
# =============================================================================

# =============================================================================
# CloudWatch Alarms - RDS Failover Events
# =============================================================================

# RDS Failover Alert - Immediate notification when failover occurs
resource "aws_cloudwatch_metric_alarm" "rds_failover" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-failover"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Failover"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when RDS Multi-AZ failover occurs"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]
  ok_actions    = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# RDS Availability Alert
resource "aws_cloudwatch_metric_alarm" "rds_availability" {
  count = var.db_multi_az ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-unavailable"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Availability"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "Alert when RDS database is not available"
  treat_missing_data  = "breaching"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Alarms - Replica Lag
# =============================================================================

# Aurora Replica Lag Alert
resource "aws_cloudwatch_metric_alarm" "aurora_replica_lag" {
  count = local.use_aurora && local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-aurora-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 30000  # 30 seconds in milliseconds
  alarm_description   = "Alert when Aurora replica lag exceeds 30 seconds"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.aurora_serverless[0].id
    Role                = "READER"
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# RDS Read Replica Lag (if using regular RDS with replicas)
resource "aws_cloudwatch_metric_alarm" "rds_replica_lag" {
  count = !local.use_aurora && var.db_multi_az && local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReadReplicaLag"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 30  # 30 seconds
  alarm_description   = "Alert when RDS read replica lag exceeds 30 seconds"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Alarms - Database Connections
# =============================================================================

# High Database Connections
resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80  # Alert at 80% of max connections
  alarm_description   = "Alert when RDS connections are high (potential connection pool exhaustion)"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# Low Freeable Memory (indicates memory pressure)
resource "aws_cloudwatch_metric_alarm" "rds_low_memory" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-low-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 52428800  # 50MB in bytes
  alarm_description   = "Alert when RDS freeable memory is critically low"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Alarms - Performance Metrics
# =============================================================================

# High Write Latency
resource "aws_cloudwatch_metric_alarm" "rds_high_write_latency" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-high-write-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "WriteLatency"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 0.1  # 100ms
  alarm_description   = "Alert when RDS write latency is high"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# High Read Latency
resource "aws_cloudwatch_metric_alarm" "rds_high_read_latency" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-high-read-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 0.05  # 50ms
  alarm_description   = "Alert when RDS read latency is high"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Alarms - Disk I/O
# =============================================================================

# High Disk Queue Depth
resource "aws_cloudwatch_metric_alarm" "rds_disk_queue_depth" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-disk-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DiskQueueDepth"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "Alert when RDS disk queue depth indicates I/O bottleneck"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# Transaction Logs Generation (for write-heavy workloads)
resource "aws_cloudwatch_metric_alarm" "rds_high_tps" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-high-transactions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TransactionLogsGenerated"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000  # Adjust based on baseline
  alarm_description   = "Alert when transaction log generation is abnormally high"

  dimensions = {
    DBInstanceIdentifier = local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Alarms - Enhanced Monitoring (if enabled)
# =============================================================================

# Maximum Used Transaction IDs (for PostgreSQL - prevents wraparound)
resource "aws_cloudwatch_metric_alarm" "rds_maximum_used_xids" {
  count = var.enable_enhanced_monitoring && local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-high-xid"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "MaximumUsedTransactionIDs"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 1000000000  # Alert at 1 billion (wraparound at 2 billion)
  alarm_description   = "Alert when PostgreSQL transaction ID is approaching wraparound"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres_free[0].id
  }

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# RDS Event Subscription - Enhanced Event Notifications
# =============================================================================

resource "aws_db_event_subscription" "failover" {
  count = local.is_production ? 1 : 0

  name      = "${local.name_prefix}-rds-failover-events"
  sns_topic = aws_sns_topic.alerts[0].arn

  source_type = "db-instance"
  source_ids  = local.use_aurora ? [aws_rds_cluster_instance.aurora_writer[0].id] : [aws_db_instance.postgres_free[0].id]

  event_categories = [
    "failover",
    "failure",
    "recovery"
  ]

  tags = local.common_tags
}

resource "aws_db_event_subscription" "maintenance" {
  count = local.is_production ? 1 : 0

  name      = "${local.name_prefix}-rds-maintenance-events"
  sns_topic = aws_sns_topic.alerts[0].arn

  source_type = "db-instance"
  source_ids  = local.use_aurora ? [aws_rds_cluster_instance.aurora_writer[0].id] : [aws_db_instance.postgres_free[0].id]

  event_categories = [
    "maintenance",
    "notification"
  ]

  tags = local.common_tags
}

# Aurora-specific event subscription
resource "aws_rds_event_subscription" "aurora_cluster" {
  count = local.use_aurora && local.is_production ? 1 : 0

  name      = "${local.name_prefix}-aurora-cluster-events"
  sns_topic = aws_sns_topic.alerts[0].arn

  source_type = "db-cluster"
  source_ids  = [aws_rds_cluster.aurora_serverless[0].id]

  event_categories = [
    "failover",
    "failure",
    "recovery",
    "notification"
  ]

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Dashboard - RDS Health
# =============================================================================

resource "aws_cloudwatch_dashboard" "rds_health" {
  count = local.is_production ? 1 : 0

  dashboard_name = "${local.name_prefix}-rds-health"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "RDS Connections & Availability"
          region = local.region
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id, { stat = "Average", period = 60 }],
            [".", "Availability", ".", ".", { stat = "Average", period = 60, yAxis = "right" }]
          ]
          view = "timeSeries"
          annotations = {
            horizontal = [
              {
                value = 80
                label = "Connection Alert Threshold"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Replica Lag"
          region = local.region
          metrics = local.use_aurora ? [
            ["AWS/RDS", "AuroraReplicaLag", "DBClusterIdentifier", aws_rds_cluster.aurora_serverless[0].id, { stat = "Average", period = 60 }]
          ] : []
          view = "timeSeries"
          annotations = {
            horizontal = [
              {
                value = 30000
                label = "30s Alert Threshold"
                color = "#ff0000"
              }
            ]
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Read/Write Latency"
          region = local.region
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id, { stat = "Average", period = 60 }],
            [".", "WriteLatency", ".", ".", { stat = "Average", period = 60 }]
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
          title  = "Freeable Memory & Storage"
          region = local.region
          metrics = [
            ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id, { stat = "Average", period = 300 }],
            [".", "FreeStorageSpace", ".", ".", { stat = "Average", period = 300, yAxis = "right" }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "alarm"
        x      = 0
        y      = 12
        width  = 24
        height = 3
        properties = {
          title  = "RDS Alarms"
          alarms = [
            aws_cloudwatch_metric_alarm.rds_failover[0].arn,
            aws_cloudwatch_metric_alarm.rds_high_connections[0].arn,
            aws_cloudwatch_metric_alarm.rds_low_memory[0].arn,
            aws_cloudwatch_metric_alarm.aurora_replica_lag[0].arn
          ]
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 15
        width  = 24
        height = 6
        properties = {
          title  = "RDS Error Logs"
          region = local.region
          query  = "SOURCE '/aws/rds/instance/${local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id}/postgresql' | fields @timestamp, @message | filter @message like /ERROR/ or @message like /FATAL/ or @message like /PANIC/ | sort @timestamp desc | limit 20"
        }
      }
    ]
  })
}

# =============================================================================
# CloudWatch Log Metric Filters - Database Errors
# =============================================================================

# Log group for RDS error log analysis
resource "aws_cloudwatch_log_metric_filter" "rds_errors" {
  count = local.is_production ? 1 : 0

  name           = "${local.name_prefix}-rds-errors"
  pattern        = "[date, time, env, session, logLevel=ERROR, ...]"
  log_group_name = "/aws/rds/instance/${local.use_aurora ? aws_rds_cluster_instance.aurora_writer[0].id : aws_db_instance.postgres_free[0].id}/postgresql"

  metric_transformation {
    name          = "RDSErrorCount"
    namespace     = "MechMind/RDS"
    value         = "1"
    default_value = "0"
    unit          = "Count"
  }
}

# Alarm on error rate
resource "aws_cloudwatch_metric_alarm" "rds_error_rate" {
  count = local.is_production ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RDSErrorCount"
  namespace           = "MechMind/RDS"
  period              = 300
  statistic           = "Sum"
  threshold           = 10  # Alert on 10+ errors in 5 minutes
  alarm_description   = "Alert when RDS error rate is elevated"

  alarm_actions = [aws_sns_topic.alerts[0].arn]

  tags = local.common_tags
}

# =============================================================================
# Outputs
# =============================================================================

output "rds_failover_alarm_arn" {
  description = "RDS failover alarm ARN"
  value       = local.is_production ? aws_cloudwatch_metric_alarm.rds_failover[0].arn : null
}

output "rds_replica_lag_alarm_arn" {
  description = "RDS replica lag alarm ARN"
  value       = local.is_production && local.use_aurora ? aws_cloudwatch_metric_alarm.aurora_replica_lag[0].arn : null
}

output "rds_health_dashboard_name" {
  description = "RDS health dashboard name"
  value       = local.is_production ? aws_cloudwatch_dashboard.rds_health[0].dashboard_name : null
}
