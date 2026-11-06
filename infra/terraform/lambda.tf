# -----------------------------------------------------------------------------
# API Lambda Function (Express App via @codegenie/serverless-express)
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "api" {
  function_name    = local.api_lambda_name
  role             = aws_iam_role.api_lambda_role.arn
  handler          = var.api_lambda_handler
  runtime          = var.lambda_runtime
  memory_size      = var.api_lambda_memory
  timeout          = var.api_lambda_timeout
  filename         = local.lambda_package_file
  source_code_hash = data.archive_file.backend_package.output_base64sha256

  environment {
    variables = {
      NODE_ENV                            = var.environment
      PORT                                = "3000"
      FRONTEND_ORIGIN                     = var.frontend_origin
      AUTH0_DOMAIN                        = var.auth0_domain
      AUTH0_AUDIENCE                      = var.auth0_audience
      WEATHER_PROVIDER                    = var.weather_provider
      DYNAMODB_TABLE_NAME                 = aws_dynamodb_table.alerts_table.name
      DYNAMODB_GSI_NAME                   = local.dynamodb_gsi_name
      ALERT_PERSISTENCE                   = "dynamodb"
      GEMINI_API_KEY                      = var.gemini_api_key
      GEMINI_MODEL                        = var.gemini_model
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.api_lambda_logs,
    aws_iam_role_policy.api_lambda_logging,
    aws_iam_role_policy.api_lambda_dynamodb
  ]

  tags = merge(local.common_tags, {
    Name = local.api_lambda_name
  })
}

# -----------------------------------------------------------------------------
# Lambda Function URL (Public HTTP Endpoint for SPA)
# -----------------------------------------------------------------------------

resource "aws_lambda_function_url" "api_url" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_origins     = [var.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers     = ["content-type", "authorization", "x-requested-with", "accept"]
    expose_headers    = ["content-range", "x-content-range"]
    max_age           = 86400
  }
}

# -----------------------------------------------------------------------------
# Scheduled Alert Worker Lambda Function
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "scheduled_worker" {
  function_name    = local.worker_lambda_name
  role             = aws_iam_role.worker_lambda_role.arn
  handler          = var.worker_lambda_handler
  runtime          = var.lambda_runtime
  memory_size      = var.worker_lambda_memory
  timeout          = var.worker_lambda_timeout
  filename         = local.lambda_package_file
  source_code_hash = data.archive_file.backend_package.output_base64sha256

  environment {
    variables = {
      NODE_ENV                            = var.environment
      WEATHER_PROVIDER                    = var.weather_provider
      DYNAMODB_TABLE_NAME                 = aws_dynamodb_table.alerts_table.name
      DYNAMODB_GSI_NAME                   = local.dynamodb_gsi_name
      ALERT_PERSISTENCE                   = "dynamodb"
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.worker_lambda_logs,
    aws_iam_role_policy.worker_lambda_logging,
    aws_iam_role_policy.worker_lambda_dynamodb
  ]

  tags = merge(local.common_tags, {
    Name = local.worker_lambda_name
  })
}
