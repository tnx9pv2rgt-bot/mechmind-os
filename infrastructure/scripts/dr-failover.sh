#!/bin/bash
# =============================================================================
# MechMind OS v10 - Disaster Recovery Failover Automation Script
# RDS Failover, Cross-Region Recovery, and Point-in-Time Restore
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration & Constants
# =============================================================================

SCRIPT_VERSION="1.0.0"
LOG_FILE="/var/log/mechmind/dr-failover-$(date +%Y%m%d-%H%M%S).log"
ENVIRONMENT="${ENVIRONMENT:-prod}"
AWS_REGION="${AWS_REGION:-us-east-1}"
DR_REGION="${DR_REGION:-eu-west-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================

log_info() {
    local msg="[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] [INFO] $1"
    echo -e "${BLUE}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

log_success() {
    local msg="[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] [SUCCESS] $1"
    echo -e "${GREEN}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

log_warning() {
    local msg="[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] [WARNING] $1"
    echo -e "${YELLOW}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

log_error() {
    local msg="[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] [ERROR] $1"
    echo -e "${RED}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

# =============================================================================
# Helper Functions
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &>/dev/null; then
        log_error "AWS CLI not found. Please install and configure AWS CLI."
        exit 1
    fi
    
    # Check jq
    if ! command -v jq &>/dev/null; then
        log_error "jq not found. Please install jq."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        log_error "AWS credentials not configured or invalid."
        exit 1
    fi
    
    # Get account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "AWS Account: $ACCOUNT_ID"
    
    # Create log directory if needed
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    
    log_success "Prerequisites check passed"
}

get_db_instance_id() {
    echo "mechmind-${ENVIRONMENT}-postgres"
}

get_cluster_id() {
    echo "mechmind-${ENVIRONMENT}-aurora"
}

# =============================================================================
# Scenario 1: RDS Primary Failover (Multi-AZ)
# =============================================================================

failover_multi_az() {
    log_info "=== SCENARIO 1: Multi-AZ Failover ==="
    
    local DB_INSTANCE_ID=$(get_db_instance_id)
    local CLUSTER_ID=$(get_cluster_id)
    
    log_info "Current database status:"
    aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,AvailabilityZone,MultiAZ]' \
        --output table 2>/dev/null || \
    aws rds describe-db-clusters \
        --db-cluster-identifier "$CLUSTER_ID" \
        --query 'DBClusters[0].[DBClusterIdentifier,Status,AvailabilityZones]' \
        --output table
    
    echo ""
    log_warning "This will initiate a forced failover. Current connections will be dropped."
    read -p "Are you sure you want to proceed? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "Failover cancelled"
        return 1
    fi
    
    # Enable read-only mode first to prevent writes
    log_info "Enabling read-only mode..."
    aws rds modify-db-parameter-group \
        --db-parameter-group-name "mechmind-${ENVIRONMENT}-postgres-params" \
        --parameters ParameterName=default_transaction_read_only,ParameterValue=on,ApplyMethod=immediate 2>/dev/null || \
    aws rds modify-db-cluster-parameter-group \
        --db-cluster-parameter-group-name "mechmind-${ENVIRONMENT}-aurora-params" \
        --parameters ParameterName=default_transaction_read_only,ParameterValue=on,ApplyMethod=immediate 2>/dev/null || true
    
    # Initiate failover
    log_info "Initiating forced failover..."
    aws rds reboot-db-instance \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --force-failover 2>/dev/null || \
    aws rds failover-db-cluster \
        --db-cluster-identifier "$CLUSTER_ID" 2>/dev/null || {
        log_error "Failed to initiate failover"
        return 1
    }
    
    # Monitor failover progress
    log_info "Monitoring failover progress..."
    local attempts=0
    local max_attempts=60
    
    while [ $attempts -lt $max_attempts ]; do
        local status=$(aws rds describe-db-instances \
            --db-instance-identifier "$DB_INSTANCE_ID" \
            --query 'DBInstances[0].DBInstanceStatus' \
            --output text 2>/dev/null || echo "unknown")
        
        log_info "Current status: $status (attempt $((attempts+1))/$max_attempts)"
        
        if [[ "$status" == "available" ]]; then
            break
        fi
        
        sleep 5
        attempts=$((attempts+1))
    done
    
    # Verify new primary
    log_info "Verifying new primary..."
    local new_az=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].AvailabilityZone' \
        --output text 2>/dev/null || echo "unknown")
    
    log_success "Failover complete. New primary in AZ: $new_az"
    
    # Disable read-only mode
    log_info "Disabling read-only mode..."
    aws rds modify-db-parameter-group \
        --db-parameter-group-name "mechmind-${ENVIRONMENT}-postgres-params" \
        --parameters ParameterName=default_transaction_read_only,ParameterValue=off,ApplyMethod=immediate 2>/dev/null || \
    aws rds modify-db-cluster-parameter-group \
        --db-cluster-parameter-group-name "mechmind-${ENVIRONMENT}-aurora-params" \
        --parameters ParameterName=default_transaction_read_only,ParameterValue=off,ApplyMethod=immediate 2>/dev/null || true
    
    # Test connectivity
    test_database_connectivity
    
    return 0
}

# =============================================================================
# Scenario 2: Point-in-Time Restore
# =============================================================================

point_in_time_restore() {
    log_info "=== SCENARIO 2: Point-in-Time Restore ==="
    
    local DB_INSTANCE_ID=$(get_db_instance_id)
    local RESTORE_TIME="${1:-}"
    
    if [[ -z "$RESTORE_TIME" ]]; then
        # Default to 1 hour ago
        RESTORE_TIME=$(date -u -d '1 hour ago' '+%Y-%m-%d %H:%M:%S')
        log_info "No restore time specified, using: $RESTORE_TIME"
    fi
    
    local RESTORE_INSTANCE="${DB_INSTANCE_ID}-pit-restore-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Source: $DB_INSTANCE_ID"
    log_info "Restore time: $RESTORE_TIME"
    log_info "Target instance: $RESTORE_INSTANCE"
    
    # Get VPC security groups from source
    local vpc_sg=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
        --output text 2>/dev/null || echo "")
    
    # Get instance class from source
    local instance_class=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].DBInstanceClass' \
        --output text 2>/dev/null || echo "db.t3.micro")
    
    # Create PITR instance
    log_info "Creating point-in-time restore instance..."
    aws rds restore-db-instance-to-point-in-time \
        --source-db-instance-identifier "$DB_INSTANCE_ID" \
        --target-db-instance-identifier "$RESTORE_INSTANCE" \
        --restore-time "$RESTORE_TIME" \
        --db-instance-class "$instance_class" \
        --no-multi-az \
        --publicly-accessible false \
        --vpc-security-group-ids "$vpc_sg" \
        --no-auto-minor-version-upgrade
    
    log_info "Waiting for restore to complete (this may take 15-30 minutes)..."
    aws rds wait db-instance-available --db-instance-identifier "$RESTORE_INSTANCE"
    
    log_success "Restore complete! Instance: $RESTORE_INSTANCE"
    
    # Get connection details
    local endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "$RESTORE_INSTANCE" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    log_info "Restored database endpoint: $endpoint"
    
    # Offer options
    echo ""
    log_info "Restore complete. Next steps:"
    echo "  1. Verify data integrity"
    echo "  2. Replace production (full swap)"
    echo "  3. Extract specific data (selective)"
    echo "  4. Delete restored instance (cancel)"
    echo ""
    read -p "Choose option (1/2/3/4): " choice
    
    case $choice in
        1)
            verify_data_integrity "$RESTORE_INSTANCE"
            ;;
        2)
            full_swap "$DB_INSTANCE_ID" "$RESTORE_INSTANCE"
            ;;
        3)
            log_info "Selective restore mode. Use endpoint: $endpoint"
            log_info "Remember to delete instance when done: $RESTORE_INSTANCE"
            ;;
        4)
            log_info "Deleting restored instance..."
            aws rds delete-db-instance \
                --db-instance-identifier "$RESTORE_INSTANCE" \
                --skip-final-snapshot
            log_success "Instance deleted"
            ;;
        *)
            log_warning "Invalid option. Instance $RESTORE_INSTANCE is still running."
            ;;
    esac
}

# =============================================================================
# Scenario 3: Cross-Region Failover to DR
# =============================================================================

cross_region_failover() {
    log_info "=== SCENARIO 3: Cross-Region Failover ==="
    
    local DB_INSTANCE_ID=$(get_db_instance_id)
    local TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    local DR_INSTANCE="${DB_INSTANCE_ID}-dr-${TIMESTAMP}"
    
    log_info "Primary Region: $AWS_REGION"
    log_info "DR Region: $DR_REGION"
    
    # Find latest cross-region backup
    log_info "Finding latest cross-region backup..."
    local latest_backup=$(aws backup list-recovery-points-by-backup-vault \
        --backup-vault-name "mechmind-${ENVIRONMENT}-dr-backup-vault" \
        --region "$DR_REGION" \
        --query 'sort_by(RecoveryPoints, &CreationDate)[-1].[RecoveryPointArn,CreationDate]' \
        --output text 2>/dev/null | head -1)
    
    if [[ -z "$latest_backup" ]]; then
        log_error "No backups found in DR region. Check backup configuration."
        return 1
    fi
    
    local backup_arn=$(echo "$latest_backup" | awk '{print $1}')
    local backup_date=$(echo "$latest_backup" | awk '{print $2}')
    
    log_info "Latest backup: $backup_date"
    log_info "Backup ARN: $backup_arn"
    
    read -p "Proceed with DR activation? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log_info "DR activation cancelled"
        return 1
    fi
    
    # Restore database in DR region
    log_info "Restoring database in DR region..."
    
    # Get subnet group from DR region or create default
    local dr_subnet_group=$(aws rds describe-db-subnet-groups \
        --region "$DR_REGION" \
        --query 'DBSubnetGroups[0].DBSubnetGroupName' \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$dr_subnet_group" || "$dr_subnet_group" == "None" ]]; then
        log_warning "No DB subnet group found in DR region. You may need to create one first."
        return 1
    fi
    
    # Start restore job via AWS Backup
    aws backup start-restore-job \
        --recovery-point-arn "$backup_arn" \
        --metadata '{"InstanceClass":"db.t3.micro","Engine":"postgres","PubliclyAccessible":"false"}' \
        --iam-role-arn "arn:aws:iam::${ACCOUNT_ID}:role/service-role/AWSBackupDefaultServiceRole" \
        --resource-type "RDS" \
        --region "$DR_REGION"
    
    log_info "Restore job started. Monitor progress in AWS Backup console."
    log_info "Once complete, update application configuration to use DR endpoint."
    
    return 0
}

# =============================================================================
# Helper: Test Database Connectivity
# =============================================================================

test_database_connectivity() {
    log_info "Testing database connectivity..."
    
    local DB_INSTANCE_ID=$(get_db_instance_id)
    local endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$endpoint" ]]; then
        log_warning "Could not get database endpoint"
        return 1
    fi
    
    log_info "Testing connection to: $endpoint"
    
    # Get credentials from Secrets Manager
    local secret=$(aws secretsmanager get-secret-value \
        --secret-id "mechmind-${ENVIRONMENT}/database/credentials" \
        --query SecretString \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$secret" ]]; then
        log_warning "Could not retrieve database credentials from Secrets Manager"
        return 1
    fi
    
    local db_user=$(echo "$secret" | jq -r '.username')
    local db_pass=$(echo "$secret" | jq -r '.password')
    local db_name=$(echo "$secret" | jq -r '.dbname // "mechmind"')
    
    # Test with pg_isready if available
    if command -v pg_isready &>/dev/null; then
        if PGPASSWORD="$db_pass" pg_isready -h "$endpoint" -U "$db_user" -d "$db_name" -t 10; then
            log_success "Database connectivity test passed"
            return 0
        else
            log_error "Database connectivity test failed"
            return 1
        fi
    else
        log_warning "pg_isready not available, skipping connectivity test"
        return 0
    fi
}

# =============================================================================
# Helper: Verify Data Integrity
# =============================================================================

verify_data_integrity() {
    local instance_id="${1:-$(get_db_instance_id)}"
    
    log_info "Verifying data integrity for: $instance_id"
    
    local endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "$instance_id" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    # Get credentials
    local secret=$(aws secretsmanager get-secret-value \
        --secret-id "mechmind-${ENVIRONMENT}/database/credentials" \
        --query SecretString \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$secret" ]]; then
        log_error "Could not retrieve credentials"
        return 1
    fi
    
    local db_user=$(echo "$secret" | jq -r '.username')
    local db_pass=$(echo "$secret" | jq -r '.password')
    local db_name=$(echo "$secret" | jq -r '.dbname // "mechmind"')
    
    export PGPASSWORD="$db_pass"
    
    log_info "Checking row counts on critical tables..."
    
    psql -h "$endpoint" -U "$db_user" -d "$db_name" -c "
        SELECT 'customers' as table_name, count(*) as row_count FROM customers
        UNION ALL
        SELECT 'bookings', count(*) FROM bookings
        UNION ALL
        SELECT 'users', count(*) FROM users
        UNION ALL
        SELECT 'vehicles', count(*) FROM vehicles
        UNION ALL
        SELECT 'tenants', count(*) FROM tenants;
    " 2>/dev/null || {
        log_error "Failed to query database"
        return 1
    }
    
    log_info "Checking for orphaned records..."
    
    psql -h "$endpoint" -U "$db_user" -d "$db_name" -c "
        SELECT 
            'bookings without customers' as check_name,
            count(*) as orphaned_count
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE c.id IS NULL
        UNION ALL
        SELECT 
            'vehicles without customers',
            count(*)
        FROM vehicles v
        LEFT JOIN customers c ON v.customer_id = c.id
        WHERE c.id IS NULL;
    " 2>/dev/null || true
    
    log_success "Data integrity check complete"
}

# =============================================================================
# Helper: Full Swap (Replace Production)
# =============================================================================

full_swap() {
    local source_instance="$1"
    local target_instance="$2"
    
    log_warning "This will replace production database with restored instance!"
    read -p "Type 'REPLACE' to confirm: " confirm
    
    if [[ "$confirm" != "REPLACE" ]]; then
        log_info "Swap cancelled"
        return 1
    fi
    
    log_info "Initiating full swap..."
    
    # Rename instances
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local temp_name="${source_instance}-old-${timestamp}"
    
    log_info "Step 1: Renaming source instance to $temp_name"
    aws rds modify-db-instance \
        --db-instance-identifier "$source_instance" \
        --new-db-instance-identifier "$temp_name" \
        --apply-immediately
    
    log_info "Waiting for rename to complete..."
    aws rds wait db-instance-available --db-instance-identifier "$temp_name"
    
    log_info "Step 2: Renaming target instance to $source_instance"
    aws rds modify-db-instance \
        --db-instance-identifier "$target_instance" \
        --new-db-instance-identifier "$source_instance" \
        --apply-immediately
    
    log_info "Waiting for rename to complete..."
    aws rds wait db-instance-available --db-instance-identifier "$source_instance"
    
    log_success "Swap complete!"
    log_info "Old instance is now: $temp_name (delete when confirmed stable)"
}

# =============================================================================
# Parameter Group Management
# =============================================================================

set_read_only() {
    local enabled="${1:-true}"
    local value=$([[ "$enabled" == "true" ]] && echo "on" || echo "off")
    
    log_info "Setting read-only mode to: $value"
    
    aws rds modify-db-parameter-group \
        --db-parameter-group-name "mechmind-${ENVIRONMENT}-postgres-params" \
        --parameters ParameterName=default_transaction_read_only,ParameterValue=$value,ApplyMethod=immediate 2>/dev/null || \
    aws rds modify-db-cluster-parameter-group \
        --db-cluster-parameter-group-name "mechmind-${ENVIRONMENT}-aurora-params" \
        --parameters ParameterName=default_transaction_read_only,ParameterValue=$value,ApplyMethod=immediate 2>/dev/null || {
        log_error "Failed to modify parameter group"
        return 1
    }
    
    log_success "Read-only mode set to $value"
}

# =============================================================================
# Status Check
# =============================================================================

show_status() {
    log_info "=== RDS Status Check ==="
    
    local DB_INSTANCE_ID=$(get_db_instance_id)
    local CLUSTER_ID=$(get_cluster_id)
    
    echo ""
    log_info "Database Instance Status:"
    aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,AvailabilityZone,MultiAZ,Engine,EngineVersion]' \
        --output table 2>/dev/null || \
    aws rds describe-db-clusters \
        --db-cluster-identifier "$CLUSTER_ID" \
        --query 'DBClusters[0].[DBClusterIdentifier,Status,Engine,EngineVersion]' \
        --output table
    
    echo ""
    log_info "Backup Status:"
    aws rds describe-db-snapshots \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --snapshot-type automated \
        --query 'DBSnapshots[0].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
        --output table 2>/dev/null || echo "No automated snapshots found"
    
    echo ""
    log_info "Recent Events:"
    aws rds describe-events \
        --source-identifier "$DB_INSTANCE_ID" \
        --source-type db-instance \
        --duration 60 \
        --query 'Events[:5].[Date,Message]' \
        --output table 2>/dev/null || true
}

# =============================================================================
# Usage & Main
# =============================================================================

show_usage() {
    cat <<EOF
MechMind OS v10 - Disaster Recovery Failover Script v${SCRIPT_VERSION}

Usage: $0 <command> [options]

Commands:
  status                    Show current RDS status and recent events
  failover                  Initiate Multi-AZ failover
  pit-restore [timestamp]   Point-in-time restore (default: 1 hour ago)
  dr-failover               Cross-region failover to DR environment
  verify [instance-id]      Verify data integrity of specified instance
  read-only [true|false]    Set database to read-only mode

Options:
  Environment Variables:
    ENVIRONMENT    Target environment (dev/staging/prod) [default: prod]
    AWS_REGION     AWS region for primary resources [default: us-east-1]
    DR_REGION      AWS region for DR [default: eu-west-1]

Examples:
  # Check database status
  $0 status

  # Initiate failover
  $0 failover

  # Restore to 2 hours ago
  $0 pit-restore "2024-01-15 10:00:00"

  # Verify data integrity
  $0 verify mechmind-prod-postgres

  # Enable read-only mode
  $0 read-only true

EOF
}

main() {
    local command="${1:-help}"
    
    check_prerequisites
    
    case "$command" in
        status)
            show_status
            ;;
        failover)
            failover_multi_az
            ;;
        pit-restore)
            point_in_time_restore "${2:-}"
            ;;
        dr-failover)
            cross_region_failover
            ;;
        verify)
            verify_data_integrity "${2:-$(get_db_instance_id)}"
            ;;
        read-only)
            set_read_only "${2:-true}"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
