# -----------------------------------------------------------------------------
# Amazon EventBridge Scheduled Rule & Dead-Letter Queue
# -----------------------------------------------------------------------------

# Dead-Letter Queue for capturing failed EventBridge worker invocations
resource "aws_sqs_queue" "worker_dlq" {
  name                      = "${local.worker_lambda_name}-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = merge(local.common_tags, {
    Name = "${local.worker_lambda_name}-dlq"
  })
}

# Queue policy permitting EventBridge to send dropped events to the DLQ
resource "aws_sqs_queue_policy" "worker_dlq" {
  queue_url = aws_sqs_queue.worker_dlq.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgeToSendMessages"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.worker_dlq.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.worker_schedule.arn
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_event_rule" "worker_schedule" {
  name                = "${local.worker_lambda_name}-schedule"
  description         = "Periodic scheduled trigger for Weatherly alert evaluation worker"
  schedule_expression = var.worker_schedule_expression
  tags                = local.common_tags
}

resource "aws_cloudwatch_event_target" "worker_target" {
  rule      = aws_cloudwatch_event_rule.worker_schedule.name
  target_id = "ScheduledAlertWorkerLambda"
  arn       = aws_lambda_function.scheduled_worker.arn

  # Dead-letter configuration preserves failed events for operator diagnosis
  dead_letter_config {
    arn = aws_sqs_queue.worker_dlq.arn
  }

  # Retry policy: 2 retry attempts within 1 hour before dead-letter routing
  retry_policy {
    maximum_retry_attempts       = 2
    maximum_event_age_in_seconds = 3600
  }
}

resource "aws_lambda_permission" "allow_eventbridge_invoke_worker" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_worker.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.worker_schedule.arn
}
