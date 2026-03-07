# MechMind OS - Development Environment
# Region: us-east-1 (lowest latency for most users, cheapest)

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local backend for dev (use S3 for team environments)
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "mechmind-os"
      Environment = "dev"
      ManagedBy   = "terraform"
      Owner       = "platform-team"
    }
  }
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  project_name     = "mechmind"
  environment      = "dev"
  vpc_cidr         = "10.0.0.0/16"
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
  single_nat_gateway = true # Cost optimization for dev
}

# Lambda + RDS Module
module "lambda_rds" {
  source = "../../modules/lambda-rds"

  project_name     = "mechmind"
  environment      = "dev"
  vpc_id           = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  # RDS Configuration (Free Tier)
  db_instance_class = "db.t3.micro"
  db_name           = "mechmind_os"
  db_username       = "mechmind"

  # Lambda Configuration (512MB ARM64 Graviton2)
  lambda_memory_size          = 512
  lambda_reserved_concurrency = 50
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "api_gateway_url" {
  value = module.lambda_rds.api_gateway_endpoint
}

output "lambda_function_url" {
  value = module.lambda_rds.lambda_function_url
}

output "rds_endpoint" {
  value     = module.lambda_rds.rds_endpoint
  sensitive = true
}

output "db_secret_arn" {
  value = module.lambda_rds.db_secret_arn
}
