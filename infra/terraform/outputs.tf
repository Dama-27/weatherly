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
