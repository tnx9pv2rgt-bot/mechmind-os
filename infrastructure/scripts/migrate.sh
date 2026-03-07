#!/bin/bash
# =============================================================================
# MechMind OS v10 - Database Migration Script
# Handles database migrations for all environments
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# =============================================================================
# Configuration
# =============================================================================
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

get_database_url() {
    log_info "Fetching database credentials from Secrets Manager..."
    
    SECRET_NAME="mechmind-$ENVIRONMENT/database/credentials"
    
    if ! SECRET=$(aws secretsmanager get-secret-value \
        --secret-id "$SECRET_NAME" \
        --query SecretString \
        --output text 2>/dev/null); then
        log_error "Failed to retrieve secret: $SECRET_NAME"
        exit 1
    fi
    
    DB_HOST=$(echo "$SECRET" | jq -r .host)
    DB_USER=$(echo "$SECRET" | jq -r .username)
    DB_PASS=$(echo "$SECRET" | jq -r .password)
    DB_NAME=$(echo "$SECRET" | jq -r .dbname)
    DB_PORT=$(echo "$SECRET" | jq -r .port // "5432")
    
    if [ -z "$DB_HOST" ] || [ "$DB_HOST" == "null" ]; then
        log_error "Database host not found in secret"
        exit 1
    fi
    
    DATABASE_URL="postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
    echo "$DATABASE_URL"
}

# =============================================================================
# Migration Commands
# =============================================================================

cmd_status() {
    log_info "Checking migration status for $ENVIRONMENT..."
    
    DATABASE_URL=$(get_database_url)
    export DATABASE_URL
    
    npx prisma migrate status
}

cmd_deploy() {
    log_info "Deploying migrations to $ENVIRONMENT..."
    
    DATABASE_URL=$(get_database_url)
    export DATABASE_URL
    
    log_info "Target database: $(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:/:\/\/***:/')"
    
    read -p "Are you sure you want to run migrations? (y/N): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        log_warning "Migration cancelled"
        exit 0
    fi
    
    npx prisma migrate deploy
    log_success "Migrations deployed successfully!"
}

cmd_create() {
    local name=$1
    if [ -z "$name" ]; then
        log_error "Migration name required"
        echo "Usage: $0 $ENVIRONMENT create <migration-name>"
        exit 1
    fi
    
    log_info "Creating new migration: $name"
    npx prisma migrate dev --name "$name"
}

cmd_reset() {
    log_warning "This will RESET the database and apply all migrations!"
    read -p "Are you absolutely sure? Type 'RESET' to confirm: " confirm
    
    if [ "$confirm" != "RESET" ]; then
        log_warning "Reset cancelled"
        exit 0
    fi
    
    DATABASE_URL=$(get_database_url)
    export DATABASE_URL
    
    npx prisma migrate reset --force
    log_success "Database reset and migrations applied!"
}

cmd_seed() {
    log_info "Seeding database for $ENVIRONMENT..."
    
    DATABASE_URL=$(get_database_url)
    export DATABASE_URL
    
    npx prisma db seed
    log_success "Database seeded!"
}

cmd_validate() {
    log_info "Validating schema for $ENVIRONMENT..."
    
    npx prisma validate
    log_success "Schema is valid!"
}

cmd_generate() {
    log_info "Generating Prisma client..."
    
    npx prisma generate
    log_success "Prisma client generated!"
}

cmd_studio() {
    log_info "Starting Prisma Studio..."
    
    DATABASE_URL=$(get_database_url)
    export DATABASE_URL
    
    npx prisma studio
}

cmd_backup() {
    log_info "Creating database backup for $ENVIRONMENT..."
    
    DATABASE_URL=$(get_database_url)
    export DATABASE_URL
    
    BACKUP_FILE="backup-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).sql"
    
    # Extract connection details
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
    
    PGPASSWORD="$DB_PASS" pg_dump \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -Fc \
        -f "$BACKUP_FILE"
    
    log_success "Backup created: $BACKUP_FILE"
    
    # Upload to S3 if configured
    S3_BUCKET="mechmind-$ENVIRONMENT-storage-$(aws sts get-caller-identity --query Account --output text)"
    if aws s3 ls "s3://$S3_BUCKET" &>/dev/null; then
        aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/"
        log_success "Backup uploaded to S3"
        rm "$BACKUP_FILE"
    fi
}

# =============================================================================
# Main
# =============================================================================

show_usage() {
    cat <<EOF
MechMind OS Database Migration Script

Usage: $0 <environment> <command> [options]

Environments:
  dev       Development environment
  staging   Staging environment  
  prod      Production environment

Commands:
  status        Check migration status
  deploy        Deploy pending migrations
  create <name> Create a new migration
  reset         Reset database (DANGEROUS!)
  seed          Run database seeds
  validate      Validate Prisma schema
  generate      Generate Prisma client
  studio        Open Prisma Studio
  backup        Create database backup

Examples:
  $0 dev status              # Check migration status
  $0 dev deploy              # Deploy migrations to dev
  $0 dev create add_users    # Create new migration
  $0 staging backup          # Create backup
  $0 prod deploy             # Deploy to production

EOF
}

main() {
    if [ $# -lt 2 ]; then
        show_usage
        exit 1
    fi
    
    ENVIRONMENT=$1
    COMMAND=$2
    shift 2
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        show_usage
        exit 1
    fi
    
    # Extra confirmation for production
    if [ "$ENVIRONMENT" == "prod" ]; then
        case $COMMAND in
            reset|deploy)
                log_warning "You are about to run '$COMMAND' on PRODUCTION!"
                read -p "Type 'PROD' to confirm: " confirm
                if [ "$confirm" != "PROD" ]; then
                    log_warning "Operation cancelled"
                    exit 0
                fi
                ;;
        esac
    fi
    
    case $COMMAND in
        status)
            cmd_status
            ;;
        deploy)
            cmd_deploy
            ;;
        create)
            cmd_create "$1"
            ;;
        reset)
            cmd_reset
            ;;
        seed)
            cmd_seed
            ;;
        validate)
            cmd_validate
            ;;
        generate)
            cmd_generate
            ;;
        studio)
            cmd_studio
            ;;
        backup)
            cmd_backup
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
