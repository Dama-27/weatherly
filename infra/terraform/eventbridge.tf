# -----------------------------------------------------------------------------
# Amazon EventBridge Scheduled Rule (CloudWatch Events)
# -----------------------------------------------------------------------------

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
}

resource "aws_lambda_permission" "allow_eventbridge_invoke_worker" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_worker.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.worker_schedule.arn
}
