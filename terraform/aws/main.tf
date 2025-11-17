# ========================================
# AWS Infrastructure for LLM Governance
# ========================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "llm-governance-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "llm-governance-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "LLM Governance Dashboard"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC
module "vpc" {
  source = "../modules/vpc"

  name               = "${var.project_name}-vpc"
  cidr               = var.vpc_cidr
  azs                = var.availability_zones
  private_subnets    = var.private_subnets
  public_subnets     = var.public_subnets
  database_subnets   = var.database_subnets
  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

# EKS Cluster
module "eks" {
  source = "../modules/eks"

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  node_groups = {
    general = {
      desired_size = 3
      min_size     = 3
      max_size     = 10
      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
      labels = {
        role = "general"
      }
      taints = []
    }

    compute = {
      desired_size = 2
      min_size     = 2
      max_size     = 8
      instance_types = ["c5.xlarge"]
      capacity_type  = "SPOT"
      labels = {
        role = "compute"
      }
      taints = []
    }
  }

  enable_irsa = true
}

# RDS PostgreSQL with TimescaleDB
module "rds" {
  source = "../modules/rds"

  identifier        = "${var.project_name}-postgres"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  port     = 5432

  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnets
  allowed_security_groups = [module.eks.cluster_security_group_id]

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  multi_az               = true
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot"

  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  parameters = [
    {
      name  = "shared_preload_libraries"
      value = "timescaledb"
    }
  ]
}

# ElastiCache Redis
module "elasticache" {
  source = "../modules/elasticache"

  cluster_id         = "${var.project_name}-redis"
  engine             = "redis"
  node_type          = var.redis_node_type
  num_cache_nodes    = 1
  parameter_group_family = "redis7"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  allowed_security_groups = [module.eks.cluster_security_group_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true

  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
}

# S3 Bucket for backups
resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-backups"
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "archive-old-backups"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# IAM Role for service accounts
resource "aws_iam_role" "llm_governance_sa" {
  name = "${var.project_name}-service-account"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = module.eks.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${module.eks.oidc_provider}:sub" = "system:serviceaccount:llm-governance:llm-governance-sa"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "llm_governance_s3" {
  role       = aws_iam_role.llm_governance_sa.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 30
}

# Output values
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.endpoint
}

output "s3_backup_bucket" {
  description = "S3 backup bucket name"
  value       = aws_s3_bucket.backups.id
}
