#!/usr/bin/env bash
set -euo pipefail

# Weatherly Frontend Deployment Script (Bash / CI)
#
# Steps:
# 1. Verifies AWS CLI and caller identity.
# 2. Resolves S3 bucket and CloudFront distribution ID from env vars, args, or Terraform outputs.
# 3. Compiles production frontend assets (npm run build).
# 4. Uploads hashed assets (/assets/*) with immutable 1-year cache headers.
# 5. Uploads index.html and root files with must-revalidate no-cache headers.
# 6. Invalidates CloudFront cache for /index.html and /.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
TERRAFORM_DIR="${ROOT_DIR}/infra/terraform"

echo "=== Weatherly Frontend Deployment (Bash) ==="

# Check AWS CLI
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed or not in PATH." >&2
  exit 1
fi

BUCKET_NAME="${FRONTEND_S3_BUCKET:-}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"

# Parse optional arguments: --bucket <name> --distribution-id <id>
while [[ $# -gt 0 ]]; do
  case $1 in
    --bucket)
      BUCKET_NAME="$2"
      shift 2
      ;;
    --distribution-id)
      DISTRIBUTION_ID="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Discover from Terraform if not set
if [[ -z "$BUCKET_NAME" || -z "$DISTRIBUTION_ID" ]]; then
  if command -v terraform &> /dev/null && [ -d "${TERRAFORM_DIR}/.terraform" ]; then
    echo "Querying targets from Terraform outputs..."
    BUCKET_NAME="${BUCKET_NAME:-$(cd "${TERRAFORM_DIR}" && terraform output -raw frontend_s3_bucket_name 2>/dev/null || true)}"
    DISTRIBUTION_ID="${DISTRIBUTION_ID:-$(cd "${TERRAFORM_DIR}" && terraform output -raw frontend_cloudfront_distribution_id 2>/dev/null || true)}"
  fi
fi

if [[ -z "$BUCKET_NAME" || -z "$DISTRIBUTION_ID" ]]; then
  echo "Error: Missing FRONTEND_S3_BUCKET or CLOUDFRONT_DISTRIBUTION_ID." >&2
  echo "Set them via environment variables or run terraform apply first." >&2
  exit 1
fi

echo "Target Bucket:       s3://${BUCKET_NAME}"
echo "CloudFront Dist ID:  ${DISTRIBUTION_ID}"

# Verify AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
  echo "Error: AWS credentials invalid or expired. Run 'aws configure' first." >&2
  exit 1
fi

# 1. Build frontend
echo "[1/4] Building production frontend bundle..."
cd "${FRONTEND_DIR}"
npm run build

if [ ! -f "dist/index.html" ]; then
  echo "Error: dist/index.html not found. Build failed." >&2
  exit 1
fi

# 2. Upload hashed static assets with immutable cache
echo "[2/4] Syncing /assets/* with 1-year immutable caching..."
if [ -d "dist/assets" ]; then
  aws s3 sync dist/assets "s3://${BUCKET_NAME}/assets" \
    --delete \
    --cache-control "public, max-age=31536000, immutable"
fi

# 3. Upload index.html and root files with no-cache revalidation
echo "[3/4] Syncing index.html and root files with must-revalidate caching..."
aws s3 sync dist "s3://${BUCKET_NAME}" \
  --exclude "assets/*" \
  --delete \
  --cache-control "public, max-age=0, must-revalidate"

# 4. Invalidate CloudFront cache
echo "[4/4] Creating CloudFront invalidation for /index.html and /..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/index.html" "/" \
  --query "Invalidation.Id" \
  --output text)

echo "Invalidation created: ${INVALIDATION_ID}"
echo "=== Frontend Deployment Successfully Completed! ==="
