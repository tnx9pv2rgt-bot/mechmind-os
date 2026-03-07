#!/bin/bash
# AWS Setup Script - MechMind OS 2026
# Run this first: chmod +x setup-aws.sh && ./setup-aws.sh

set -e

echo "=== MechMind OS AWS Setup ==="
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Installing..."
    curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
    sudo installer -pkg AWSCLIV2.pkg -target /
    rm AWSCLIV2.pkg
fi

echo "✓ AWS CLI version: $(aws --version)"

# Check credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo ""
    echo "⚠️  AWS credentials not configured."
    echo ""
    echo "Please configure using ONE of these methods:"
    echo ""
    echo "1. AWS CLI (interactive):"
    echo "   aws configure"
    echo ""
    echo "2. Environment variables:"
    echo "   export AWS_ACCESS_KEY_ID=your_key"
    echo "   export AWS_SECRET_ACCESS_KEY=your_secret"
    echo "   export AWS_REGION=us-east-1"
    echo ""
    echo "3. AWS SSO (recommended for teams):"
    echo "   aws sso login --profile mechmind-dev"
    echo ""
    exit 1
fi

echo "✓ AWS credentials verified"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "  Account: $ACCOUNT"
echo "  Region: $(aws configure get region)"

# Create S3 bucket for Terraform state (if not exists)
BUCKET_NAME="mechmind-terraform-state-${ACCOUNT}"
if ! aws s3 ls "s3://${BUCKET_NAME}" &> /dev/null; then
    echo ""
    echo "Creating Terraform state bucket: ${BUCKET_NAME}"
    aws s3 mb "s3://${BUCKET_NAME}" --region us-east-1
    aws s3api put-bucket-versioning \
        --bucket "${BUCKET_NAME}" \
        --versioning-configuration Status=Enabled
    echo "✓ S3 bucket created"
else
    echo "✓ Terraform state bucket exists"
fi

echo ""
echo "=== Setup Complete ==="
echo "You can now run: cd infrastructure/terraform/environments/dev && terraform apply"
