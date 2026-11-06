locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  api_lambda_name     = "${local.name_prefix}-api"
  worker_lambda_name  = "${local.name_prefix}-scheduled-worker"
  dynamodb_table_name = "${local.name_prefix}-alerts"
  dynamodb_gsi_name   = "GSI1"

  # S3 bucket name (globally unique)
  frontend_bucket_name = var.frontend_bucket_name != "" ? var.frontend_bucket_name : "${local.name_prefix}-frontend-${data.aws_caller_identity.current.account_id}"

  # Dynamic Lambda package source directory
  lambda_source_dir = fileexists("${path.module}/../../backend/.lambda-package/package.json") ? "${path.module}/../../backend/.lambda-package" : "${path.module}/../../backend/dist"

  # Path to deployment package
  lambda_package_file = var.lambda_package_path != "" ? var.lambda_package_path : data.archive_file.backend_package.output_path
}
