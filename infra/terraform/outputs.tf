output "api_endpoint_url" {
  description = "Public HTTPS Lambda Function URL for the Express API"
  value       = aws_lambda_function_url.api_url.function_url
}

output "api_lambda_name" {
  description = "Name of the Express API Lambda function"
  value       = aws_lambda_function.api.function_name
}

output "api_lambda_arn" {
  description = "ARN of the Express API Lambda function"
  value       = aws_lambda_function.api.arn
}

output "worker_lambda_name" {
  description = "Name of the Scheduled Alert Worker Lambda function"
  value       = aws_lambda_function.scheduled_worker.function_name
}

output "worker_lambda_arn" {
  description = "ARN of the Scheduled Alert Worker Lambda function"
  value       = aws_lambda_function.scheduled_worker.arn
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB alerts table"
  value       = aws_dynamodb_table.alerts_table.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB alerts table"
  value       = aws_dynamodb_table.alerts_table.arn
}

output "dynamodb_gsi_name" {
  description = "Name of the sparse GSI for enabled alerts"
  value       = local.dynamodb_gsi_name
}

output "eventbridge_rule_arn" {
  description = "ARN of the EventBridge scheduled rule"
  value       = aws_cloudwatch_event_rule.worker_schedule.arn
}

output "api_log_group" {
  description = "CloudWatch log group for the API Lambda"
  value       = aws_cloudwatch_log_group.api_lambda_logs.name
}

output "worker_log_group" {
  description = "CloudWatch log group for the Worker Lambda"
  value       = aws_cloudwatch_log_group.worker_lambda_logs.name
}

# -----------------------------------------------------------------------------
# Frontend Hosting (S3 + CloudFront)
# -----------------------------------------------------------------------------

output "frontend_s3_bucket_name" {
  description = "Name of the private S3 bucket hosting compiled frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_s3_bucket_arn" {
  description = "ARN of the private S3 bucket hosting compiled frontend assets"
  value       = aws_s3_bucket.frontend.arn
}

output "frontend_cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution serving the SPA frontend"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution serving the SPA frontend"
  value       = aws_cloudfront_distribution.frontend.arn
}

output "frontend_cloudfront_domain" {
  description = "CloudFront default domain name for the Weatherly frontend application"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_url" {
  description = "Public HTTPS entrypoint URL for the Weatherly frontend application"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

# -----------------------------------------------------------------------------
# GitHub Actions OIDC CI/CD
# -----------------------------------------------------------------------------

output "github_oidc_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions via OIDC"
  value       = aws_iam_role.github_actions_deploy.arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider"
  value       = local.github_oidc_provider_arn
}
