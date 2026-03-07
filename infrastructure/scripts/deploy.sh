#!/bin/bash
# =============================================================================
# MechMind OS v10 - Deployment Script
# Manual deployment helper for infrastructure and Lambda functions
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Configuration
# =============================================================================
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
TERRAFORM_DIR="infrastructure/terraform"

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

check_aws_credentials() {
    log_info "Checking AWS credentials..."
    if ! aws sts get-caller-identity &>/dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'"
        exit 1
    fi
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_success "AWS credentials valid (Account: $ACCOUNT_ID)"
}

check_terraform() {
    log_info "Checking Terraform installation..."
    if ! command -v terraform &>/dev/null; then
        log_error "Terraform not found. Please install Terraform."
        exit 1
    fi
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    log_success "Terraform version: $TERRAFORM_VERSION"
}

check_node() {
    log_info "Checking Node.js installation..."
    if ! command -v node &>/dev/null; then
        log_error "Node.js not found. Please install Node.js."
        exit 1
    fi
    NODE_VERSION=$(node --version)
    log_success "Node.js version: $NODE_VERSION"
}

# =============================================================================
# Deployment Functions
# =============================================================================

deploy_infrastructure() {
    log_info "Deploying infrastructure for environment: $ENVIRONMENT"
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init \
        -backend-config="bucket=mechmind-terraform-state-$ACCOUNT_ID" \
        -backend-config="key=$ENVIRONMENT/terraform.tfstate" \
        -backend-config="region=$AWS_REGION" \
        -backend-config="dynamodb_table=mechmind-terraform-locks" \
        || terraform init
    
    # Format check
    log_info "Checking Terraform formatting..."
    terraform fmt -check -recursive || log_warning "Terraform files need formatting. Run: terraform fmt -recursive"
    
    # Validate
    log_info "Validating Terraform configuration..."
    terraform validate
    
    # Plan
    log_info "Planning Terraform changes..."
    terraform plan -var-file="environments/$ENVIRONMENT.tfvars" -out=tfplan
    
    # Apply
    log_info "Applying Terraform changes..."
    read -p "Do you want to apply these changes? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        terraform apply tfplan
        log_success "Infrastructure deployed successfully!"
    else
        log_warning "Deployment cancelled"
        exit 0
    fi
    
    cd - > /dev/null
}

build_lambda() {
    log_info "Building Lambda package..."
    
    # Install dependencies
    npm ci
    
    # Run tests
    log_info "Running tests..."
    npm test -- --passWithNoTests || log_warning "Tests failed or not found"
    
    # Build
    log_info "Building application..."
    npm run build
    
    # Package
    log_info "Packaging Lambda..."
    mkdir -p dist/lambda
    cp -r dist/* dist/lambda/
    cp package*.json dist/lambda/
    cd dist/lambda && npm ci --production && cd ../..
    
    # Create zip
    cd dist && zip -r lambda-package.zip lambda/ && cd ..
    
    log_success "Lambda package built: dist/lambda-package.zip"
}

deploy_lambda() {
    log_info "Deploying Lambda functions..."
    
    if [ ! -f "dist/lambda-package.zip" ]; then
        log_error "Lambda package not found. Run build first."
        exit 1
    fi
    
    FUNCTIONS=(
        "mechmind-$ENVIRONMENT-api-main"
        "mechmind-$ENVIRONMENT-worker-booking"
        "mechmind-$ENVIRONMENT-worker-notification"
        "mechmind-$ENVIRONMENT-voice-handler"
    )
    
    for func in "${FUNCTIONS[@]}"; do
        log_info "Deploying $func..."
        aws lambda update-function-code \
            --function-name "$func" \
            --zip-file fileb://dist/lambda-package.zip \
            --publish
        log_success "Deployed $func"
    done
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Get database credentials from Secrets Manager
    SECRET=$(aws secretsmanager get-secret-value \
        --secret-id "mechmind-$ENVIRONMENT/database/credentials" \
        --query SecretString \
        --output text)
    
    DB_HOST=$(echo "$SECRET" | jq -r .host)
    DB_USER=$(echo "$SECRET" | jq -r .username)
    DB_PASS=$(echo "$SECRET" | jq -r .password)
    DB_NAME=$(echo "$SECRET" | jq -r .dbname)
    
    export DATABASE_URL="postgres://$DB_USER:$DB_PASS@$DB_HOST:5432/$DB_NAME"
    
    log_info "Running migrations on $DB_HOST..."
    npm run migrate:deploy
    
    log_success "Migrations completed!"
}

health_check() {
    log_info "Running health checks..."
    
    # Get Lambda URL
    LAMBDA_URL=$(aws lambda get-function-url-config \
        --function-name "mechmind-$ENVIRONMENT-api-main" \
        --query FunctionUrl \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$LAMBDA_URL" ]; then
        log_warning "Lambda URL not found. Skipping health check."
        return
    fi
    
    log_info "Checking health endpoint: $LAMBDA_URL"
    
    # Health check with retries
    for i in {1..5}; do
        if curl -sf "$LAMBDA_URL"health &>/dev/null; then
            log_success "Health check passed!"
            return
        fi
        log_warning "Health check attempt $i failed. Retrying..."
        sleep 5
    done
    
    log_error "Health check failed after 5 attempts"
    exit 1
}

# =============================================================================
# Main
# =============================================================================

show_usage() {
    cat <<EOF
MechMind OS Deployment Script

Usage: $0 <environment> [command]

Environments:
  dev       Development environment
  staging   Staging environment
  prod      Production environment

Commands:
  infra     Deploy infrastructure only (Terraform)
  build     Build Lambda package only
  lambda    Deploy Lambda functions only
  migrate   Run database migrations
  full      Full deployment (infra + build + lambda + migrate)
  health    Run health checks

Examples:
  $0 dev full          # Full deployment to dev
  $0 prod infra        # Deploy infrastructure to prod
  $0 staging lambda    # Deploy Lambda to staging
  $0 dev migrate       # Run migrations on dev

EOF
}

main() {
    if [ $# -lt 1 ]; then
        show_usage
        exit 1
    fi
    
    ENVIRONMENT=$1
    COMMAND=${2:-full}
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        show_usage
        exit 1
    fi
    
    log_info "Starting deployment for environment: $ENVIRONMENT"
    
    # Pre-flight checks
    check_aws_credentials
    
    case $COMMAND in
        infra)
            check_terraform
            deploy_infrastructure
            ;;
        build)
            check_node
            build_lambda
            ;;
        lambda)
            deploy_lambda
            health_check
            ;;
        migrate)
            check_node
            run_migrations
            ;;
        health)
            health_check
            ;;
        full)
            check_terraform
            check_node
            deploy_infrastructure
            build_lambda
            deploy_lambda
            run_migrations
            health_check
            log_success "Full deployment completed successfully!"
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
