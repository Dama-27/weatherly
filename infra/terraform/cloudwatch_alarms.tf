# -----------------------------------------------------------------------------
# CloudWatch Operational Metric Alarms
# -----------------------------------------------------------------------------

locals {
  alarm_action_list = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  # Duration approaching timeout thresholds (milliseconds)
  api_duration_threshold_ms    = var.api_lambda_timeout * 1000 * var.duration_threshold_ratio
  worker_duration_threshold_ms = var.worker_lambda_timeout * 1000 * var.duration_threshold_ratio
}

# 1. API Lambda Unhandled Errors Alarm
resource "aws_cloudwatch_metric_alarm" "api_errors" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.api_lambda_name}-unhandled-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = var.api_error_threshold
  alarm_description   = "Triggers when the Express API Lambda encounters unhandled exceptions or crashes."
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }

  alarm_actions = local.alarm_action_list
  ok_actions    = local.alarm_action_list
  tags          = local.common_tags
}

# 2. Scheduled Alert Worker Lambda Unhandled Errors Alarm
resource "aws_cloudwatch_metric_alarm" "worker_errors" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.worker_lambda_name}-unhandled-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = var.worker_error_threshold
  alarm_description   = "Triggers when the Scheduled Alert Worker Lambda encounters unhandled exceptions."
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.scheduled_worker.function_name
  }

  alarm_actions = local.alarm_action_list
  ok_actions    = local.alarm_action_list
  tags          = local.common_tags
}

# 3. API Lambda Invocations Throttled Alarm
resource "aws_cloudwatch_metric_alarm" "api_throttles" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.api_lambda_name}-throttles"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Triggers when API Lambda invocations are throttled by AWS account or concurrency limits."
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }

  alarm_actions = local.alarm_action_list
  ok_actions    = local.alarm_action_list
  tags          = local.common_tags
}

# 4. Worker Lambda Invocations Throttled Alarm
resource "aws_cloudwatch_metric_alarm" "worker_throttles" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.worker_lambda_name}-throttles"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Triggers when Scheduled Alert Worker invocations are throttled by concurrency limits."
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.scheduled_worker.function_name
  }

  alarm_actions = local.alarm_action_list
  ok_actions    = local.alarm_action_list
  tags          = local.common_tags
}

# 5. API Lambda Duration Approaching Timeout Alarm
resource "aws_cloudwatch_metric_alarm" "api_duration" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.api_lambda_name}-duration-approaching-timeout"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = local.api_duration_threshold_ms
  alarm_description   = "Triggers when API Lambda duration exceeds 80% of configured timeout (${var.api_lambda_timeout}s)."
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }

  alarm_actions = local.alarm_action_list
  ok_actions    = local.alarm_action_list
  tags          = local.common_tags
}

# 6. Worker Lambda Duration Approaching Timeout Alarm
resource "aws_cloudwatch_metric_alarm" "worker_duration" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.worker_lambda_name}-duration-approaching-timeout"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = local.worker_duration_threshold_ms
  alarm_description   = "Triggers when Worker Lambda duration exceeds 80% of configured timeout (${var.worker_lambda_timeout}s)."
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.scheduled_worker.function_name
  }

  alarm_actions = local.alarm_action_list
  ok_actions    = local.alarm_action_list
  tags          = local.common_tags
}

# 7. DynamoDB Table Throttled Requests Alarm
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.dynamodb_table_name}-throttled-requests"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Triggers when DynamoDB read or write requests are throttled due to partition throughput spikes."
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.alerts_table.name
  }

  alarm_actions = local.alarm_action_list
  ok_actions    = local.alarm_action_list
  tags          = local.common_tags
}

# 8. Worker Dead-Letter Queue (DLQ) Dropped Events Alarm
resource "aws_cloudwatch_metric_alarm" "worker_dlq_messages" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.worker_lambda_name}-dlq-messages"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Triggers when dropped scheduled events arrive in the worker Dead-Letter Queue."
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.worker_dlq.name
  }

  alarm_actions = local.alarm_action_list
  ok_actions    = local.alarm_action_list
  tags          = local.common_tags
}
