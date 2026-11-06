#!/usr/bin/env node

/**
 * Weatherly Lambda Packaging Script
 *
 * Reproducibly builds the backend TypeScript application and stages production
 * dependencies for deployment to AWS Lambda.
 *
 * Steps:
 * 1. Compiles TypeScript into backend/dist via `npm run build`.
 * 2. Prepares a clean staging directory in backend/.lambda-package/.
 * 3. Copies compiled dist/ and package manifests into staging.
 * 4. Executes `npm ci --omit=dev` inside staging to include production dependencies only.
 * 5. Verifies required entrypoint files (dist/lambda.js, dist/workers/scheduled-alerts.worker.js).
 */

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '..');
const BACKEND_DIR = resolve(ROOT_DIR, 'backend');
const STAGING_DIR = resolve(BACKEND_DIR, '.lambda-package');

function run(command, cwd = ROOT_DIR) {
  console.log(`> [${cwd}] ${command}`);
  execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
  });
}

function main() {
  console.log('=== Packaging Weatherly Backend for AWS Lambda ===\n');

  // 1. Build backend TypeScript source
  console.log('[1/4] Compiling backend TypeScript (tsc)...');
  run('npm run build', BACKEND_DIR);

  const apiEntry = resolve(BACKEND_DIR, 'dist', 'lambda.js');
  const workerEntry = resolve(BACKEND_DIR, 'dist', 'workers', 'scheduled-alerts.worker.js');

  if (!existsSync(apiEntry) || !existsSync(workerEntry)) {
    console.error('Error: Build output missing expected Lambda entrypoints.');
    process.exit(1);
  }

  // 2. Clean & recreate staging directory
  console.log('\n[2/4] Preparing staging directory at backend/.lambda-package...');
  if (existsSync(STAGING_DIR)) {
    rmSync(STAGING_DIR, { recursive: true, force: true });
  }
  mkdirSync(STAGING_DIR, { recursive: true });

  // 3. Copy compiled dist/ and manifests into staging
  console.log('\n[3/4] Copying compiled artifacts and manifests...');
  cpSync(resolve(BACKEND_DIR, 'dist'), resolve(STAGING_DIR, 'dist'), { recursive: true });
  cpSync(resolve(BACKEND_DIR, 'package.json'), resolve(STAGING_DIR, 'package.json'));
  cpSync(resolve(BACKEND_DIR, 'package-lock.json'), resolve(STAGING_DIR, 'package-lock.json'));

  // 4. Install production-only dependencies
  console.log('\n[4/4] Installing production dependencies (npm ci --omit=dev)...');
  run('npm ci --omit=dev --no-audit', STAGING_DIR);

  console.log('\n=== Lambda Packaging Complete! Staged at backend/.lambda-package ===\n');
}

main();
