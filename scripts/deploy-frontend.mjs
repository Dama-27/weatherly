#!/usr/bin/env node

/**
 * Weatherly Frontend Deployment Script (Cross-Platform)
 *
 * Steps:
 * 1. Checks AWS CLI availability and authentication.
 * 2. Determines target S3 bucket and CloudFront distribution ID (from CLI arguments, env vars, or Terraform outputs).
 * 3. Builds the production bundle (tsc -b && vite build).
 * 4. Syncs hashed static assets (/assets/*) with long-lived immutable cache (max-age=31536000, immutable).
 * 5. Syncs HTML and root assets with immediate revalidation (max-age=0, must-revalidate).
 * 6. Creates CloudFront invalidation for /index.html and / to avoid stale cached SPA routes.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');
const FRONTEND_DIR = resolve(ROOT_DIR, 'frontend');
const TERRAFORM_DIR = resolve(ROOT_DIR, 'infra', 'terraform');

function run(command, cwd = ROOT_DIR, options = {}) {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
    ...options,
  });
}

function tryRun(command, cwd = ROOT_DIR) {
  try {
    return execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

async function main() {
  console.log('=== Weatherly Frontend Deployment ===\n');

  // Check AWS CLI
  const awsVersion = tryRun('aws --version');
  if (!awsVersion) {
    console.error('Error: AWS CLI is not installed or not in your system PATH.');
    console.error('Please install the AWS CLI and configure credentials before deploying.');
    process.exit(1);
  }
  console.log(`[AWS CLI] ${awsVersion}`);

  // Resolve target S3 bucket and CloudFront distribution ID
  let bucket = process.env.FRONTEND_S3_BUCKET || '';
  let distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || '';

  // Parse command line arguments: --bucket <name> --distribution-id <id>
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bucket' && args[i + 1]) {
      bucket = args[++i];
    } else if (args[i] === '--distribution-id' && args[i + 1]) {
      distributionId = args[++i];
    }
  }

  // Fallback to Terraform outputs if not provided
  if (!bucket || !distributionId) {
    console.log('[Terraform] Resolving targets from infra/terraform outputs...');
    if (existsSync(resolve(TERRAFORM_DIR, '.terraform'))) {
      if (!bucket) {
        bucket = tryRun('terraform output -raw frontend_s3_bucket_name', TERRAFORM_DIR);
      }
      if (!distributionId) {
        distributionId = tryRun('terraform output -raw frontend_cloudfront_distribution_id', TERRAFORM_DIR);
      }
    }
  }

  if (!bucket || !distributionId) {
    console.error('\nError: Missing deployment target parameters.');
    console.error('Please provide FRONTEND_S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID via:');
    console.error('  1. Environment variables: FRONTEND_S3_BUCKET=... CLOUDFRONT_DISTRIBUTION_ID=... npm run deploy');
    console.error('  2. CLI arguments: npm run deploy -- --bucket <name> --distribution-id <id>');
    console.error('  3. Or run "terraform apply" inside infra/terraform so outputs are discoverable.\n');
    process.exit(1);
  }

  console.log(`[Target Bucket]       s3://${bucket}`);
  console.log(`[Target Distribution] ${distributionId}\n`);

  // Verify AWS credentials
  const callerIdentity = tryRun('aws sts get-caller-identity');
  if (!callerIdentity) {
    console.error('Error: Unable to locate active AWS credentials or session expired.');
    console.error('Please run "aws configure" or authenticate with your AWS SSO/IAM identity.');
    process.exit(1);
  }

  // 1. Build frontend bundle
  console.log('[1/4] Building production frontend bundle (tsc -b && vite build)...');
  run('npm run build', FRONTEND_DIR);

  const distIndexHtml = resolve(FRONTEND_DIR, 'dist', 'index.html');
  if (!existsSync(distIndexHtml)) {
    console.error(`Error: Production build failed. Expected ${distIndexHtml} to exist.`);
    process.exit(1);
  }

  // 2. Upload hashed assets (/assets/*) with immutable cache
  console.log('\n[2/4] Syncing hashed assets (/assets/*) with 1-year immutable caching...');
  const assetsDir = resolve(FRONTEND_DIR, 'dist', 'assets');
  if (existsSync(assetsDir)) {
    run(
      `aws s3 sync dist/assets s3://${bucket}/assets --delete --cache-control "public, max-age=31536000, immutable"`,
      FRONTEND_DIR
    );
  }

  // 3. Upload root files (index.html, favicon, etc.) with must-revalidate cache
  console.log('\n[3/4] Syncing index.html and root files with no-cache revalidation...');
  run(
    `aws s3 sync dist s3://${bucket} --exclude "assets/*" --delete --cache-control "public, max-age=0, must-revalidate"`,
    FRONTEND_DIR
  );

  // 4. Invalidate CloudFront cache
  console.log('\n[4/4] Creating CloudFront invalidation for /index.html and /...');
  const invalidationOutput = tryRun(
    `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/index.html" "/"`,
    FRONTEND_DIR
  );
  console.log(invalidationOutput || 'Invalidation submitted successfully.');

  console.log('\n=== Frontend Deployment Successfully Completed! ===\n');
}

main().catch((err) => {
  console.error('\nDeployment failed:', err.message || err);
  process.exit(1);
});
