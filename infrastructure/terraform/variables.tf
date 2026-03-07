# Variables for MechMind OS Infrastructure

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "mechmind"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for SES"
  type        = string
  default     = "mechmind.io"
}

variable "api_url" {
  description = "API URL for webhooks"
  type        = string
  default     = "https://api.mechmind.io"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}
