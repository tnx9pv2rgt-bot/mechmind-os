variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "mechmind"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for RDS and Lambda"
  type        = list(string)
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro" # Free Tier eligible
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "mechmind_os"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "mechmind"
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB (512 recommended for NestJS)"
  type        = number
  default     = 512
}

variable "lambda_reserved_concurrency" {
  description = "Lambda reserved concurrency (0 for unlimited)"
  type        = number
  default     = 100
}
