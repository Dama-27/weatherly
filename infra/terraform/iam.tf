# Trust policy allowing Lambda service to assume execution roles
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# -----------------------------------------------------------------------------
# API Lambda Execution Role & Least-Privilege Policies
# -----------------------------------------------------------------------------

resource "aws_iam_role" "api_lambda_role" {
  name               = "${local.api_lambda_name}-execution-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = local.common_tags
}

data "aws_iam_policy_document" "api_lambda_logging" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "${aws_cloudwatch_log_group.api_lambda_logs.arn}:*"
    ]
  }
}

resource "aws_iam_role_policy" "api_lambda_logging" {
  name   = "${local.api_lambda_name}-logging-policy"
  role   = aws_iam_role.api_lambda_role.id
  policy = data.aws_iam_policy_document.api_lambda_logging.json
}

data "aws_iam_policy_document" "api_lambda_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query"
    ]
    resources = [
      aws_dynamodb_table.alerts_table.arn,
      "${aws_dynamodb_table.alerts_table.arn}/index/*"
    ]
  }
}

resource "aws_iam_role_policy" "api_lambda_dynamodb" {
  name   = "${local.api_lambda_name}-dynamodb-policy"
  role   = aws_iam_role.api_lambda_role.id
  policy = data.aws_iam_policy_document.api_lambda_dynamodb.json
}

# -----------------------------------------------------------------------------
# Scheduled Worker Lambda Execution Role & Least-Privilege Policies
# -----------------------------------------------------------------------------

resource "aws_iam_role" "worker_lambda_role" {
  name               = "${local.worker_lambda_name}-execution-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = local.common_tags
}

data "aws_iam_policy_document" "worker_lambda_logging" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "${aws_cloudwatch_log_group.worker_lambda_logs.arn}:*"
    ]
  }
}

resource "aws_iam_role_policy" "worker_lambda_logging" {
  name   = "${local.worker_lambda_name}-logging-policy"
  role   = aws_iam_role.worker_lambda_role.id
  policy = data.aws_iam_policy_document.worker_lambda_logging.json
}

data "aws_iam_policy_document" "worker_lambda_dynamodb" {
  # Worker queries enabled alerts across all users via sparse GSI1
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Query"
    ]
    resources = [
      "${aws_dynamodb_table.alerts_table.arn}/index/*"
    ]
  }

  # Worker checks deduplication records and saves new evaluation records
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem"
    ]
    resources = [
      aws_dynamodb_table.alerts_table.arn
    ]
  }
}

resource "aws_iam_role_policy" "worker_lambda_dynamodb" {
  name   = "${local.worker_lambda_name}-dynamodb-policy"
  role   = aws_iam_role.worker_lambda_role.id
  policy = data.aws_iam_policy_document.worker_lambda_dynamodb.json
}
