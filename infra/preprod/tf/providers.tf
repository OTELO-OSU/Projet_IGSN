terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
    http = {
      source  = "hashicorp/http"
      version = ">= 3.0"
    }
  }

  # Partial backend: pass bucket/key/region at init time, e.g.
  #   tofu -chdir=infra/preprod/tf init -backend-config=backend.hcl
  # State locking is S3-native (use_lockfile in the backend config); no DynamoDB.
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "opentofu"
    }
  }
}
