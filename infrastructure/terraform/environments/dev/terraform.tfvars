# MechMind OS - Development Environment Variables
# 2026 Best Practices: Environment-specific Lambda memory configuration

# Lambda Memory Configuration (2026 Cost/Latency Trade-off)
# 
# For NestJS + Prisma workloads, memory affects both CPU and cost:
# 
# ┌─────────┬──────────────┬─────────────┬───────────┬─────────────┐
# │ Memory  │ Cost/ms      │ Cold Start  │ Execution │ Cost/1M req │
# ├─────────┼──────────────┼─────────────┼───────────┼─────────────┤
# │ 128MB   │ $0.0000000021│ ~3.0s       │ ~800ms    │ $1.68       │
# │ 256MB   │ $0.0000000042│ ~1.5s       │ ~400ms    │ $1.68       │ ← Dev choice
# │ 512MB   │ $0.0000000083│ ~0.8s       │ ~200ms    │ $1.66       │ ← Prod choice
# │ 1024MB  │ $0.0000000167│ ~0.6s       │ ~120ms    │ $2.00       │
# └─────────┴──────────────┴─────────────┴───────────┴─────────────┘
#
# Source: AWS Compute Blog 2025
# https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-1/

# Dev: Use 256MB for cost optimization (slower but acceptable for dev)
# Prod: Use 512MB for optimal latency/cost ratio
lambda_memory_size = 256

# Reserved concurrency prevents runaway costs in dev
lambda_reserved_concurrency = 10

# RDS Configuration
db_instance_class = "db.t3.micro"  # Free Tier eligible

# Tags
cost_center = "engineering-dev"
environment = "dev"
