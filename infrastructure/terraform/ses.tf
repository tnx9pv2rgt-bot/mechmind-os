# AWS SES Configuration for MechMind OS
# Manages email sending infrastructure with bounce/complaint handling

# SES Domain Identity
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# SES Domain DKIM
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# SES Configuration Set
resource "aws_ses_configuration_set" "main" {
  name = "${var.project_name}-${var.environment}"

  delivery_options {
    tls_policy = "Require"
  }

  reputation_options {
    tracking_enabled = true
  }
}

# SNS Topic for Bounces
resource "aws_sns_topic" "ses_bounces" {
  name = "${var.project_name}-ses-bounces-${var.environment}"
  
  tags = {
    Name        = "SES Bounces"
    Environment = var.environment
  }
}

# SNS Topic for Complaints
resource "aws_sns_topic" "ses_complaints" {
  name = "${var.project_name}-ses-complaints-${var.environment}"
  
  tags = {
    Name        = "SES Complaints"
    Environment = var.environment
  }
}

# SNS Topic for Deliveries
resource "aws_sns_topic" "ses_deliveries" {
  name = "${var.project_name}-ses-deliveries-${var.environment}"
  
  tags = {
    Name        = "SES Deliveries"
    Environment = var.environment
  }
}

# SES Event Destination
resource "aws_ses_event_destination" "sns" {
  name                   = "${var.project_name}-event-destination-${var.environment}"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["bounce", "complaint", "delivery"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_bounces.arn
  }
}

# HTTPS Subscription for Bounces
resource "aws_sns_topic_subscription" "bounce_webhook" {
  topic_arn = aws_sns_topic.ses_bounces.arn
  protocol  = "https"
  endpoint  = "${var.api_url}/webhooks/ses/bounce"
}

# HTTPS Subscription for Complaints
resource "aws_sns_topic_subscription" "complaint_webhook" {
  topic_arn = aws_sns_topic.ses_complaints.arn
  protocol  = "https"
  endpoint  = "${var.api_url}/webhooks/ses/complaint"
}

# IAM Policy for SES Sending
resource "aws_iam_policy" "ses_sending" {
  name        = "${var.project_name}-ses-sending-${var.environment}"
  description = "Policy for sending emails via SES"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:GetSendStatistics",
        ]
        Resource = [
          aws_ses_domain_identity.main.arn,
          "${aws_ses_domain_identity.main.arn}/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ses:GetIdentityVerificationAttributes",
          "ses:GetIdentityDkimAttributes",
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Alarm for High Bounce Rate
resource "aws_cloudwatch_metric_alarm" "bounce_rate" {
  alarm_name          = "${var.project_name}-high-bounce-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Reputation.BounceRate"
  namespace           = "AWS/SES"
  period              = "300"
  statistic           = "Average"
  threshold           = "0.05" # 5% bounce rate
  alarm_description   = "This metric monitors SES bounce rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ConfigurationSet = aws_ses_configuration_set.main.name
  }
}

# CloudWatch Alarm for High Complaint Rate
resource "aws_cloudwatch_metric_alarm" "complaint_rate" {
  alarm_name          = "${var.project_name}-high-complaint-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Reputation.ComplaintRate"
  namespace           = "AWS/SES"
  period              = "300"
  statistic           = "Average"
  threshold           = "0.001" # 0.1% complaint rate
  alarm_description   = "This metric monitors SES complaint rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ConfigurationSet = aws_ses_configuration_set.main.name
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts-${var.environment}"
}
