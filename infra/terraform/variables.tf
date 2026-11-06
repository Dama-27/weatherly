variable "aws_region" {
  description = "AWS region for provisioning resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project identifier used in resource names and tags"
  type        = string
  default     = "weatherly"
}

variable "frontend_origin" {
  description = "Allowed frontend origin URL for CORS configuration"
  type        = string
  default     = "http://localhost:5173"
}

variable "auth0_domain" {
  description = "Auth0 tenant domain for backend JWT token verification (e.g. your-tenant.us.auth0.com)"
  type        = string
}

variable "auth0_audience" {
  description = "Auth0 API audience identifier (e.g. https://weather-analytics-api)"
  type        = string
}

variable "weather_provider" {
  description = "Weather data provider factory identifier (open-meteo or openweathermap)"
  type        = string
  default     = "open-meteo"
}

variable "gemini_api_key" {
  description = "Google Gemini API key for AI Copilot (optional, leaves copilot in deterministic fallback if empty)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "gemini_model" {
  description = "Google Gemini model identifier for AI Copilot"
  type        = string
  default     = "gemini-1.5-flash"
}

variable "lambda_runtime" {
  description = "Node.js runtime version for AWS Lambda functions (Node.js 20 LTS)"
  type        = string
  default     = "nodejs20.x"
}

variable "api_lambda_memory" {
  description = "Memory allocation in MB for the Express API Lambda"
  type        = number
  default     = 256
}

variable "api_lambda_timeout" {
  description = "Execution timeout in seconds for the Express API Lambda"
  type        = number
  default     = 15
}

variable "api_lambda_handler" {
  description = "Handler entry point for the Express API Lambda"
  type        = string
  default     = "lambda.handler"
}

variable "worker_lambda_memory" {
  description = "Memory allocation in MB for the Scheduled Alert Worker Lambda"
  type        = number
  default     = 256
}

variable "worker_lambda_timeout" {
  description = "Execution timeout in seconds for the Scheduled Alert Worker Lambda"
  type        = number
  default     = 60
}

variable "worker_lambda_handler" {
  description = "Handler entry point for the Scheduled Alert Worker Lambda"
  type        = string
  default     = "workers/scheduled-alerts.worker.handler"
}

variable "worker_schedule_expression" {
  description = "EventBridge cron or rate schedule expression for the worker (default: every 1 hour)"
  type        = string
  default     = "rate(1 hour)"
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period in days"
  type        = number
  default     = 14
}

variable "enable_point_in_time_recovery" {
  description = "Enable DynamoDB point-in-time recovery (PITR) for backup and disaster recovery"
  type        = bool
  default     = true
}

variable "lambda_package_path" {
  description = "Custom deployment zip file path for Lambda functions (overrides local archive packaging if specified)"
  type        = string
  default     = ""
}

variable "frontend_bucket_name" {
  description = "Optional custom name for frontend S3 bucket (defaults to weatherly-<env>-frontend-<account-id>)"
  type        = string
  default     = ""
}

variable "cloudfront_price_class" {
  description = "CloudFront distribution price class (PriceClass_100: US/Europe, PriceClass_200: adds Asia/Africa/Middle East, PriceClass_All: global edge locations)"
  type        = string
  default     = "PriceClass_100"
}

variable "frontend_html_cache_ttl" {
  description = "Default TTL in seconds for index.html in CloudFront (0 ensures users receive latest SPA deployments immediately)"
  type        = number
  default     = 0
}

# -----------------------------------------------------------------------------
# GitHub Actions OIDC & CI/CD Deployment
# -----------------------------------------------------------------------------

variable "create_github_oidc_provider" {
  description = "Whether to create the GitHub Actions OIDC identity provider in AWS (set to false if already created in the AWS account)"
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "GitHub repository path in owner/repo format authorized to assume the deployment role (e.g. Dama-27/weatherly)"
  type        = string
  default     = "Dama-27/weatherly"
}

variable "github_branch" {
  description = "GitHub repository branch authorized to execute production deployments"
  type        = string
  default     = "main"
}

variable "github_environment" {
  description = "GitHub Actions environment name for deployment protection rules"
  type        = string
  default     = "production"
}
