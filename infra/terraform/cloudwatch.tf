resource "aws_cloudwatch_log_group" "api_lambda_logs" {
  name              = "/aws/lambda/${local.api_lambda_name}"
  retention_in_days = var.log_retention_days

  tags = merge(local.common_tags, {
    Name = "/aws/lambda/${local.api_lambda_name}"
  })
}

resource "aws_cloudwatch_log_group" "worker_lambda_logs" {
  name              = "/aws/lambda/${local.worker_lambda_name}"
  retention_in_days = var.log_retention_days

  tags = merge(local.common_tags, {
    Name = "/aws/lambda/${local.worker_lambda_name}"
  })
}
