terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Initial development uses a local state file to avoid chicken-and-egg bootstrap dependencies.
  # See documentation for instructions on migrating to a versioned, encrypted S3 backend
  # with DynamoDB state locking once the bootstrap S3/DynamoDB resources exist.
}
