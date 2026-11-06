# Packages the compiled TypeScript backend application for deployment.
# Dynamically packages staged production dependencies (.lambda-package) if present,
# or falls back to dist/ for lightweight local validation.
data "archive_file" "backend_package" {
  type        = "zip"
  source_dir  = local.lambda_source_dir
  output_path = "${path.module}/.terraform/builds/weatherly_backend.zip"
}

# Current AWS account and region context
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
