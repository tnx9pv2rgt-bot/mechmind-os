# =============================================================================
# MechMind OS v10 - Database Configuration
# Cost-Optimized: Free Tier RDS (12mo) → Aurora Serverless v2
# =============================================================================

# =============================================================================
# Database Subnet Group
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-db-subnet-group"
  description = "Subnet group for MechMind database"
  subnet_ids  = aws_subnet.private[*].id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

# =============================================================================
# OPTION 1: RDS PostgreSQL (FREE TIER - First 12 Months)
# db.t3.micro + 20GB storage = $0/month
# =============================================================================

resource "aws_db_instance" "postgres_free" {
  count = local.use_aurora ? 0 : 1

  identifier = "${local.name_prefix}-postgres"

  # Engine configuration
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  # Storage configuration (free tier: 20GB)
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"  # gp3 is cheaper and better performance
  storage_encrypted     = true

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = var.db_backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # High availability (skip for cost savings in dev/staging)
  multi_az = var.db_multi_az && local.is_production

  # Monitoring (skip for cost savings)
  monitoring_interval = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  # Performance Insights (skip for cost savings)
  performance_insights_enabled = var.enable_performance_insights

  # Deletion protection (enable in production)
  deletion_protection = local.is_production
  skip_final_snapshot = var.db_skip_final_snapshot || !local.is_production

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Tags
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres"
  })

  lifecycle {
    prevent_destroy = local.is_production
  }
}

# =============================================================================
# OPTION 2: Aurora Serverless v2 (SCALING PHASE)
# Auto-scaling 0.5-2 ACU = ~$60-120/month
# =============================================================================

resource "aws_rds_cluster" "aurora_serverless" {
  count = local.use_aurora ? 1 : 0

  cluster_identifier = "${local.name_prefix}-aurora"

  # Engine configuration
  engine         = "aurora-postgresql"
  engine_version = "15.4"  # Aurora PostgreSQL version
  engine_mode    = "provisioned"

  # Database configuration
  database_name   = var.db_name
  master_username = var.db_username
  master_password = random_password.db_password.result

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Serverless v2 scaling configuration
  serverlessv2_scaling_configuration {
    min_capacity = var.aurora_min_capacity
    max_capacity = var.aurora_max_capacity
  }

  # Backup configuration
  backup_retention_period = var.db_backup_retention_days
  preferred_backup_window = "03:00-04:00"

  # Encryption
  storage_encrypted = true

  # Deletion protection
  deletion_protection = local.is_production
  skip_final_snapshot = var.db_skip_final_snapshot || !local.is_production

  # Tags
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-aurora-cluster"
  })

  lifecycle {
    prevent_destroy = local.is_production
  }
}

# Aurora Serverless v2 Instance Writer
resource "aws_rds_cluster_instance" "aurora_writer" {
  count = local.use_aurora ? 1 : 0

  identifier         = "${local.name_prefix}-aurora-writer"
  cluster_identifier = aws_rds_cluster.aurora_serverless[0].id

  instance_class = "db.serverless"
  engine         = aws_rds_cluster.aurora_serverless[0].engine

  # Performance Insights (optional)
  performance_insights_enabled = var.enable_performance_insights

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-aurora-writer"
  })
}

# Aurora Serverless v2 Instance Reader (optional - for read scaling)
resource "aws_rds_cluster_instance" "aurora_reader" {
  count = local.use_aurora && var.environment == "prod" ? 1 : 0

  identifier         = "${local.name_prefix}-aurora-reader"
  cluster_identifier = aws_rds_cluster.aurora_serverless[0].id

  instance_class = "db.serverless"
  engine         = aws_rds_cluster.aurora_serverless[0].engine

  performance_insights_enabled = var.enable_performance_insights
  auto_minor_version_upgrade   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-aurora-reader"
  })
}

# =============================================================================
# Database Password
# =============================================================================

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# =============================================================================
# RDS Enhanced Monitoring IAM Role (optional)
# =============================================================================

resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name = "${local.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# =============================================================================
# RDS Event Subscription (for monitoring)
# =============================================================================

resource "aws_db_event_subscription" "default" {
  count = local.is_production ? 1 : 0

  name      = "${local.name_prefix}-rds-events"
  sns_topic = aws_sns_topic.alerts[0].arn

  source_type = "db-instance"
  source_ids  = local.use_aurora ? [aws_rds_cluster_instance.aurora_writer[0].id] : [aws_db_instance.postgres_free[0].id]

  event_categories = [
    "availability",
    "deletion",
    "failover",
    "failure",
    "low storage",
    "maintenance",
    "notification",
    "read replica",
    "recovery",
    "restoration"
  ]

  tags = local.common_tags
}

# =============================================================================
# RDS Parameter Group (Optimized for MechMind)
# =============================================================================

resource "aws_db_parameter_group" "mechmind" {
  count = local.use_aurora ? 0 : 1

  name        = "${local.name_prefix}-postgres-params"
  family      = "postgres16"
  description = "Custom parameter group for MechMind PostgreSQL"

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "100"
  }

  # Logging settings
  parameter {
    name  = "log_statement"
    value = "mod"  # Log data-modifying statements
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries > 1 second
  }

  # Performance settings
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/32768}"
  }

  tags = local.common_tags
}

# =============================================================================
# Aurora Parameter Group
# =============================================================================

resource "aws_rds_cluster_parameter_group" "mechmind" {
  count = local.use_aurora ? 1 : 0

  name        = "${local.name_prefix}-aurora-params"
  family      = "aurora-postgresql15"
  description = "Custom parameter group for MechMind Aurora"

  parameter {
    name  = "log_statement"
    value = "mod"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = local.common_tags
}
