# Weatherly

Weatherly is a modernized full-stack weather intelligence and personal dashboard application. It provides real-time conditions, interactive 24-hour hourly forecasts, 7-day extended forecasts, and an algorithmic Comfort Index (0–100) across global cities.

The application is powered by an Open-Meteo weather backend with normalized domain models and provider abstraction, paired with a modern React 19 + TypeScript frontend featuring dynamic weather condition themes and interactive visualizations.

---

## Architecture Overview

Weatherly adopts a clean layered architecture designed for provider independence and high resilience:

```text
┌────────────────────────────────────────────────────────┐
│               React 19 + TypeScript SPA                 │
│  - Location Search & Geolocation Selector              │
│  - Dynamic Weather Theming Engine (Day/Night & WMO)     │
│  - Recharts Dual-Axis 24-Hour Forecast Chart           │
│  - 7-Day Forecast with Relative Range & UV Badges      │
│  - Auth0 PKCE Authentication & Preserved Rankings View │
└───────────────────────────┬────────────────────────────┘
                            │ /api/* (Vite Proxy / HTTP)
┌───────────────────────────▼────────────────────────────┐
│              Express 5 + TypeScript Backend            │
│  - REST Controllers (Weather, Location, Cache)         │
│  - Auth0 JWT Bearer Token Middleware                   │
│  - Coordinate & Query Validation Layer                 │
│  - Multi-tier In-Memory Cache (node-cache, 300s TTL)   │
└───────────────────────────┬────────────────────────────┘
                            │ Provider Abstraction (IWeatherProvider)
┌───────────────────────────▼────────────────────────────┐
│             Provider Adapters & External APIs          │
│  - OpenMeteoProvider (Default: Forecast & Geocoding)   │
│  - OpenWeatherMapAdapter (Legacy Compatibility)        │
│  - Normalized Domain Models (WMO Code Mappings)        │
└────────────────────────────────────────────────────────┘
```

### Core Design Principles
1. **Provider Independence:** Business logic and API contracts depend exclusively on normalized domain models (`CurrentWeather`, `HourlyForecast`, `DailyForecast`, `LocationInfo`), completely decoupling the application from vendor-specific response payloads.
2. **Provider Factory:** The backend instantiates weather providers via `createWeatherProvider()`, allowing configuration via `WEATHER_PROVIDER=open-meteo` (default) or `openweathermap`.
3. **Backward Compatibility:** Preserves the legacy `/api/weather` endpoint, city ranking logic, and the 10-city Comfort Index dashboard alongside the modern personal weather view.
4. **Resilience & Sanitization:** Centralized error handling traps network timeouts (504) and provider failures (502) while preventing internal error traces or credentials from leaking to clients.

---

## Technology Stack

- **Frontend:**
  - React 19, TypeScript, Vite
  - Visualizations: Recharts (`ComposedChart`, `Area`, `Line`, `Bar`)
  - Authentication: `@auth0/auth0-react`
  - Code Quality: Oxlint, Node Native Test Runner (`node:test`)
  - Styling: Pure CSS with CSS custom properties, responsive grid/flexbox, and dynamic gradients
- **Backend:**
  - Node.js (v24 LTS / v20+), Express 5, TypeScript
  - Serverless Adapter: `@codegenie/serverless-express` (AWS Lambda & API Gateway v1/v2 handler)
  - CORS & Security: `cors`, `express-oauth2-jwt-bearer` (Auth0 RS256 JWT validation)
  - Caching: `node-cache` (TTL-based in-memory cache)
  - Testing: Vitest, Supertest
- **External Providers & APIs:**
  - **Open-Meteo API:** Hourly, daily, and current weather forecasts
  - **Open-Meteo Geocoding API:** Location search and coordinate resolution
  - **Auth0:** Universal Login with PKCE flow

---

## API Endpoints

Base URL: `http://localhost:3000`

### 1. Modern Location & Weather Endpoints
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/locations/search?q={query}&limit={n}` | Searches global locations via Open-Meteo geocoding | Optional |
| `GET` | `/api/weather/current?lat={lat}&lon={lon}&name={name}` | Returns normalized current conditions and location metadata | Optional |
| `GET` | `/api/weather/hourly?lat={lat}&lon={lon}&name={name}` | Returns next 24 hours of hourly forecast with timezone | Optional |
| `GET` | `/api/weather/daily?lat={lat}&lon={lon}&name={name}` | Returns 7-day daily forecast (min/max temp, UV max, rain sum) | Optional |
| `GET` | `/api/weather/intelligence?lat={lat}&lon={lon}&name={name}` | Returns Comfort Score, active weather hazard risk assessment, and synthesis | Optional |
| `GET` | `/api/weather/recommendations?lat={lat}&lon={lon}&name={name}` | Returns outdoor activity suitability, clothing suggestions, daily advice, and best outdoor window | Optional |
| `POST` | `/api/weather/alerts/evaluate` | Evaluates user-configured weather alert rules against current and forecast conditions | Optional |
| `POST` | `/api/assistant/ask` | Answers natural-language weather queries using Google Gemini with deterministic fallback | Optional |
| `GET` | `/api/alerts` | Lists all alert rules for the authenticated user | Yes (Bearer token) |
| `POST` | `/api/alerts` | Creates a new alert rule for the authenticated user | Yes (Bearer token) |
| `PUT` | `/api/alerts/:id` | Updates an alert rule (toggle enabled, threshold, location) | Yes (Bearer token) |
| `DELETE` | `/api/alerts/:id` | Deletes an alert rule belonging to the authenticated user | Yes (Bearer token) |

### 2. Preserved Legacy & System Endpoints
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Server health check | No |
| `GET` | `/api/weather` | Returns 10-city ranked weather data and Comfort Scores | Yes (Bearer token) |
| `GET` | `/api/cache/status` | Returns cache statistics (hits, misses, cached keys) | Yes (Bearer token) |
| `DELETE` | `/api/cache` | Clears all cached weather data and resets statistics | Yes (Bearer token) |

Protected endpoints expect the Auth0 Access Token in the request header:
```text
Authorization: Bearer <access_token>
```

---

## Weather Intelligence & Risk Assessment Engine

Weatherly features a deterministic Weather Intelligence Engine (`/api/weather/intelligence`) calculating actionable weather insights and hazard assessments:

### 1. Comfort Score Formula (0–100)
Evaluates normalized meteorological surface metrics using weighted physiological comfort curves:
```text
Comfort Score = (Temperature Score * 0.50) + (Humidity Score * 0.30) + (Wind Score * 0.10) + (Rain Score * 0.10)
```
- **Feels-Like Temperature (50%):** Ideal comfort plateau at 24°C–26°C (score 100). Scores decay symmetrically towards extreme cold or heat.
- **Relative Humidity (30%):** Ideal range 40%–60% (score 100). Penalizes arid (<30%) and muggy (>70%) conditions.
- **Wind Speed (10%):** Ideal light breeze 5–15 km/h (score 100). Calm air scores 60; high winds (>30 km/h) are penalized.
- **Precipitation (10%):** 0 mm/h scores 100; active rain or snowfall decreases score proportionally.

### 2. Multi-Hazard Risk Assessment
Analyzes current metrics and forecasts across 6 meteorological hazard categories:
- **Extreme Heat:** Elevated risk when heat index or feels-like temperature exceeds 32°C (moderate) or 38°C (high/severe).
- **Extreme Cold:** Risk flagged when feels-like temperature drops below 10°C (moderate) or below 0°C (high/freeze).
- **High Wind:** Evaluates gust hazards above 30 km/h (moderate) and 50 km/h (high/gale).
- **Heavy Precipitation:** Detects intense rainfall exceeding 5 mm/h or forecast precipitation sums.
- **Severe Storms:** Identifies active thunderstorm activity and convective systems (WMO 95, 96, 99).
- **High UV Radiation:** Flags UV Index $\ge 6$ (moderate protection required) and $\ge 8$ (high burn hazard).

### 3. Overall Condition Status
Synthesizes comfort score and active risk hazards into an actionable overall status: `ideal`, `favorable`, `moderate`, `adverse`, or `severe`.

---

## Context-Aware Weather Recommendations

The Smart Recommendations engine (`/api/weather/recommendations`) translates meteorological parameters into actionable everyday advice:

- **7 Outdoor Activities:**
  - Evaluates suitability (`excellent`, `good`, `moderate`, `poor`) for Walking, Running, Cycling, Outdoor sports, Beach activities, Hiking, and Gardening based on temperature, wind limits, UV exposure, and ground surface conditions.
- **5 Clothing Guidance Categories:**
  - Provides dynamic item suggestions for Light breathable clothing, Warm layers, Rain gear, Sun protection, and Windbreakers.
- **Optimal Outdoor Time Window:**
  - Analyzes 24-hour hourly forecast curves to automatically detect the longest continuous daylight window (2+ hours) offering minimal precipitation probability and optimal comfort.
- **Daily Weather Advice:**
  - Contextual actionable tips (e.g., carrying an umbrella, scheduling runs in the early morning to avoid peak heat, or applying broad-spectrum sunscreen).

---

## Personalized Weather Alerts & AWS DynamoDB Persistence

Weatherly supports personalized weather condition alerts with dual-mode persistence (AWS DynamoDB Single-Table in cloud deployments and In-Memory storage with scoped browser fallback):

### 1. Alert Types
- **Temperature Thresholds:** Above or below a target value (°C).
- **Rain Probability:** Exceeding a specified likelihood (%).
- **UV Index:** Exceeding target exposure limit.
- **Wind Speed:** Exceeding maximum comfort/safety speeds (km/h).
- **Severe Weather Forecasts:** Thunderstorm activity (WMO 95, 96, 99) and heavy downpour/precipitation.

### 2. DynamoDB Single-Table Schema Design
- **Table Name:** Configurable via `DYNAMODB_TABLE_NAME` (default: `weatherly-alerts`).
- **Primary Key Structure:**
  - `PK` (String): Partition key (`USER#<userId>`)
  - `SK` (String): Sort key (`ALERT#<alertId>` or `EVAL#<alertId>#<eventPeriod>`)
- **Global Secondary Index (GSI1 - Sparse Index):**
  - `GSI1PK` (String): `'ALERT#ENABLED'` (only populated when `enabled: true`)
  - `GSI1SK` (String): `${locationKey}#${userId}#${alertId}`
  *(Disabled alerts omit GSI keys, avoiding GSI storage overhead and eliminating full table scans)*

#### Access Patterns Matrix:
| Access Pattern | Target | Key Condition Expression | Purpose |
|---|---|---|---|
| **AP1: Query all alerts for a user** | Base Table | `PK = 'USER#<userId>' AND begins_with(SK, 'ALERT#')` | `GET /api/alerts` |
| **AP2: Get single alert by ID** | Base Table | `PK = 'USER#<userId>' AND SK = 'ALERT#<alertId>'` | User alert lookup & ownership check |
| **AP3: Create/Update alert** | Base Table | `PK = 'USER#<userId>' AND SK = 'ALERT#<alertId>'` | `POST /api/alerts`, `PUT /api/alerts/:id` |
| **AP4: Delete alert** | Base Table | `PK = 'USER#<userId>' AND SK = 'ALERT#<alertId>'` | `DELETE /api/alerts/:id` |
| **AP5: Query enabled alerts across all users** | GSI1 | `GSI1PK = 'ALERT#ENABLED'` | Scheduled Alert Worker bulk evaluation |
| **AP6: Check previously evaluated event** | Base Table | `PK = 'USER#<userId>' AND SK = 'EVAL#<alertId>#<eventPeriod>'` | Duplicate suppression check |
| **AP7: Record triggered evaluation event** | Base Table | `PK = 'USER#<userId>' AND SK = 'EVAL#<alertId>#<eventPeriod>'` | Audit log with 7-day TTL auto-expiry |

### 3. Scheduled Alert Worker (`backend/src/workers/scheduled-alerts.worker.ts`)
- Standalone AWS Lambda handler invoked periodically (e.g. every 15 minutes via Amazon EventBridge).
- Queries active enabled rules via GSI1 without table scans.
- Groups alerts by geographical coordinates (`latitude:longitude`) so each city's forecast is requested from Open-Meteo only once per run.
- Reuses the deterministic Day 2 evaluation engine (`evaluateAlertRules`).
- Enforces duplicate suppression: Checks `hasEvaluationRecord()` before recording new triggers.
- Partial failure isolation: Network or provider timeouts on one location do not abort evaluation of other locations.

### 4. Client-Side Resilience & Fallback
- Authenticated users automatically synchronize with backend DynamoDB persistence through verified JWT claims (`req.auth.sub`).
- If backend persistence is unreachable or when unauthenticated, Weatherly gracefully falls back to scoped `localStorage` (`weatherly_alerts_${userId}`).
- Client-side HTML5 desktop notifications operate on active browser sessions with user consent.

---

## AWS Infrastructure as Code (Terraform)

Weatherly includes a complete, production-ready Terraform configuration under `infra/terraform/` to provision the full serverless architecture on AWS, including backend APIs, worker Lambda, DynamoDB persistence, and S3 + CloudFront frontend hosting.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              AWS Serverless Architecture                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   Web Browser Client (SPA)                                                             │
│       │                                                                                │
│       ├─────────────────────────────────┐                                              │
│       │ 1. HTTPS Static Assets          │ 2. HTTPS API Requests (Bearer Token / CORS)   │
│       ▼                                 ▼                                              │
│   ┌──────────────────────────────┐  ┌──────────────────────────────────────────────┐   │
│   │ Amazon CloudFront (CDN)      │  │ Lambda Function URL (Auth: NONE)             │   │
│   │ - HTTPS-only Viewer Protocol │  │ - Verified via Auth0 RS256 JWT claims        │   │
│   │ - SPA Error Responses 403/404│  │ - CORS: Whitelists CloudFront & Dev Origins │   │
│   │ - Hashed Assets: 1-Yr Cache  │  └──────────────────────┬───────────────────────┘   │
│   │ - index.html: 0s TTL Cache   │                         │                           │
│   └──────────────┬───────────────┘                         ▼                           │
│                  │ SigV4 Signed        ┌───────────────────────────────────────────┐   │
│                  │ via OAC             │ API Lambda: weatherly-dev-api             │   │
│                  ▼                     │ Handler: dist/lambda.handler              │   │
│   ┌──────────────────────────────┐     │ - CloudWatch Structured JSON Logger       │   │
│   │ Private S3 Frontend Bucket   │     │ - Request Correlation ID (X-Correlation)  │   │
│   │ - Block Public Access: TRUE  │     └─────────────┬─────────────────────┬───────┘   │
│   │ - SSE-S3 AES-256 Encryption  │                   │                     │           │
│   │ - Versioning & Lifecycle Exp │                   │ Open-Meteo & Gemini │ Read/Write│
│   └──────────────────────────────┘                   ▼                     ▼           │
│                                        ┌────────────────────────┐ ┌──────────────────┐ │
│   ┌──────────────────────────────┐     │ External APIs          │ │ DynamoDB Table   │ │
│   │ EventBridge Scheduled Rule   │     │ - Open-Meteo Forecast  │ │ weatherly-dev-   │ │
│   │ - rate(1 hour)               │     │ - Google Gemini (Opt)  │ │ alerts           │ │
│   │ - 2x Retry Policy            │     └────────────────────────┘ │ - Single-Table   │ │
│   └──────────────┬───────────────┘                                │ - GSI1 Sparse    │ │
│                  │ Periodic Trigger                               │ - KMS, PITR, TTL │ │
│                  ▼                                                └────────▲─────────┘ │
│   ┌────────────────────────────────────────────────────────────────────────┴───────┐   │
│   │ Scheduled Worker Lambda: weatherly-dev-scheduled-worker                        │   │
│   │ Handler: dist/workers/scheduled-alerts.worker.handler                          │   │
│   │ - Partial Failure Isolation & Deduplication                                    │   │
│   └──────────────┬─────────────────────────────────────────────────────────────────┘   │
│                  │ On Persistent Failure (2 Retries Exceeded)                          │
│                  ▼                                                                     │
│   ┌──────────────────────────────┐                                                     │
│   │ SQS Dead-Letter Queue (DLQ)  │                                                     │
│   │ weatherly-dev-worker-dlq     │                                                     │
│   │ - 14-Day Message Retention   │                                                     │
│   └──────────────────────────────┘                                                     │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ CloudWatch Observability & Operational Alarms                                  │   │
│   │ - Structured JSON Logs (/aws/lambda/weatherly-dev-*) with 14-day retention     │   │
│   │ - Metric Alarms: Errors, Throttles, Duration (>80% timeout), DynamoDB, DLQ    │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Terraform Structure

```text
infra/terraform/
├── versions.tf                          # Terraform >= 1.5.0, AWS >= 5.0, Archive >= 2.4, local state
├── providers.tf                         # AWS provider with region and default resource tags
├── variables.tf                         # Input variables, defaults, validation, and sensitivity flags
├── locals.tf                            # Naming prefixes, computed tags, and build artifact paths
├── main.tf                              # Archive packaging & AWS caller identity context
├── dynamodb.tf                          # DynamoDB single-table with GSI1, PITR, KMS, and TTL
├── iam.tf                               # Least-privilege IAM execution roles and inline policies
├── lambda.tf                            # API Lambda + Function URL & Worker Lambda configuration
├── eventbridge.tf                       # Scheduled EventBridge rule, 2x retry policy, target, and SQS DLQ
├── cloudwatch.tf                        # Explicit CloudWatch log groups with 14-day retention policies
├── cloudwatch_alarms.tf                 # Operational metric alarms (Errors, Throttles, Duration, DynamoDB, DLQ)
├── s3_frontend.tf                       # Private frontend S3 bucket, encryption, versioning & OAC policy
├── cloudfront.tf                        # CloudFront OAC, cache policies, distribution & SPA routing
├── oidc.tf                              # GitHub Actions OIDC provider, scoped trust policy & deployment role
├── outputs.tf                           # Exported URLs, ARNs, table identifiers, and DLQ attributes
├── .gitignore                           # Ignores .terraform, *.tfstate, crash logs, and *.tfvars
└── environments/
    └── dev/
        └── terraform.tfvars.example     # Sample environment configuration template
```

### 2. Resources Provisioned

| Resource Type | Resource Identifier | Purpose & Specifications |
|---|---|---|
| `aws_s3_bucket` | `${project}-${env}-frontend-${account}` | Private S3 bucket storing compiled frontend assets; `force_destroy` enabled for non-prod. |
| `aws_s3_bucket_public_access_block` | `${project}-${env}-frontend-pab` | Strictly blocks all public ACLs and bucket policies; S3 remains 100% private. |
| `aws_s3_bucket_server_side_encryption_configuration` | `${project}-${env}-frontend-sse` | Default SSE-S3 encryption with Amazon managed keys (`AES256`). |
| `aws_s3_bucket_versioning` | `${project}-${env}-frontend-ver` | Object versioning enabled for auditability and rollback safety. |
| `aws_s3_bucket_lifecycle_configuration` | `${project}-${env}-frontend-lc` | Automatically expires noncurrent versions after 30 days to limit storage overhead. |
| `aws_s3_bucket_policy` | `${project}-${env}-frontend-policy` | Restricts `s3:GetObject` access exclusively to the CloudFront distribution via SigV4 OAC (`AWS:SourceArn`). |
| `aws_cloudfront_origin_access_control` | `${project}-${env}-frontend-oac` | SigV4 origin access control replacing legacy Origin Access Identity (OAI). |
| `aws_cloudfront_cache_policy` | `${project}-${env}-frontend-html` | Custom low-TTL cache policy (`default_ttl = 0`, `max_ttl = 300`) for `index.html` preventing stale SPA deploys. |
| `aws_cloudfront_distribution` | `${project}-${env}-frontend` | Global CDN with HTTPS redirect, HTTP/2 & IPv6, gzip/brotli compression, and SPA client-side routing fallback (403/404 -> `/index.html` with HTTP 200). |
| `aws_dynamodb_table` | `${project}-${env}-alerts` | Single-table storage; `PAY_PER_REQUEST` billing; KMS encryption; PITR enabled; TTL on `ttl`; Sparse GSI1 (`ALERT#ENABLED`). |
| `aws_lambda_function` | `${project}-${env}-api` | Express API handler (`dist/lambda.handler`); Node.js 20.x runtime; 512 MB memory; 15s timeout. |
| `aws_lambda_function_url` | `${project}-${env}-api-url` | Direct HTTPS entrypoint (`AuthType: NONE`); CORS automatically authorizes provisioned CloudFront domain. |
| `aws_lambda_function` | `${project}-${env}-scheduled-worker` | Scheduled alert evaluation worker (`dist/workers/scheduled-alerts.worker.handler`); 256 MB memory; 60s timeout. |
| `aws_cloudwatch_event_rule` | `${project}-${env}-worker-schedule` | EventBridge periodic schedule (default: `rate(1 hour)`). |
| `aws_cloudwatch_event_target` | `${project}-${env}-worker-target` | Dispatches EventBridge trigger directly to the scheduled worker Lambda with a 2x retry policy. |
| `aws_sqs_queue` | `${project}-${env}-worker-dlq` | SQS Dead-Letter Queue capturing failed worker executions after retries are exhausted (14-day retention). |
| `aws_lambda_permission` | `${project}-${env}-worker-permission` | Grants `events.amazonaws.com` permission to invoke the worker Lambda. |
| `aws_cloudwatch_log_group` | `/aws/lambda/${project}-${env}-api` | Dedicated logging destination; 14-day retention (prevents runaway storage). |
| `aws_cloudwatch_log_group` | `/aws/lambda/${project}-${env}-scheduled-worker` | Dedicated worker logging destination; 14-day retention. |
| `aws_cloudwatch_metric_alarm` | `api-unhandled-errors` | Alarms when API Lambda encounters unhandled exceptions (threshold: >= 1 in 5 mins). |
| `aws_cloudwatch_metric_alarm` | `worker-unhandled-errors` | Alarms when Scheduled Worker Lambda encounters unhandled exceptions (threshold: >= 1 in 5 mins). |
| `aws_cloudwatch_metric_alarm` | `api-throttles` | Alarms when API Lambda invocations are throttled by concurrency limits. |
| `aws_cloudwatch_metric_alarm` | `worker-throttles` | Alarms when Scheduled Worker invocations are throttled. |
| `aws_cloudwatch_metric_alarm` | `api-duration-approaching-timeout` | Alarms when API Lambda duration exceeds 80% of timeout (12s of 15s). |
| `aws_cloudwatch_metric_alarm` | `worker-duration-approaching-timeout` | Alarms when Worker Lambda duration exceeds 80% of timeout (48s of 60s). |
| `aws_cloudwatch_metric_alarm` | `dynamodb-throttled-requests` | Alarms when DynamoDB read or write requests are throttled. |
| `aws_cloudwatch_metric_alarm` | `worker-dlq-messages` | Alarms when any dropped message arrives in the SQS Dead-Letter Queue. |
| `aws_iam_role` & `aws_iam_policy` | `${project}-${env}-api-role` | API Lambda execution role; allows CloudWatch logging to specific group ARN; allows DynamoDB operations strictly on base table (`USER#*`). |
| `aws_iam_role` & `aws_iam_policy` | `${project}-${env}-worker-role` | Worker execution role; allows CloudWatch logging to worker group ARN; allows GSI1 query and deduplication record writes (`EVAL#*`). |
| `aws_iam_openid_connect_provider` | `github-actions-oidc-provider` | GitHub OIDC identity provider (`token.actions.githubusercontent.com`). |
| `aws_iam_role` & `aws_iam_policy` | `github-actions-deploy-role` | Scoped CI/CD deployment role restricted strictly to `repo:Dama-27/weatherly:ref:refs/heads/main`. |

### 3. Frontend Cache & Invalidation Strategy

| Asset Category | Target Path | Cache-Control Header | CloudFront Policy | Invalidation Strategy |
|---|---|---|---|---|
| **Hashed Code & Styles** | `/assets/*` (JS, CSS) | `public, max-age=31536000, immutable` | `Managed-CachingOptimized` (1 day – 1 year) | Never invalidated; cache-busted by Vite content hash. |
| **Root Entrypoint** | `/index.html` | `public, max-age=0, must-revalidate` | Custom `frontend_html` (`default_ttl = 0`) | Invalidated on each deployment (`aws cloudfront create-invalidation`). |
| **Static Icons** | `/favicon.ico`, `/vite.svg` | `public, max-age=0, must-revalidate` | Custom `frontend_html` (`default_ttl = 0`) | Invalidated on deployment if updated. |

- **Zero Stale Versions:** Because `index.html` is never cached long-term and is explicitly invalidated upon deployment, users immediately download the new `index.html` referencing the new hashed JS and CSS assets.
- **SPA Routing Fallback:** Direct navigation or browser refresh on deep paths (e.g. `https://d1234.cloudfront.net/alerts`) is intercepted by CloudFront custom error responses (HTTP 403/404) and served `/index.html` with HTTP 200, allowing the client-side router to mount seamlessly without S3 `NoSuchKey` errors.

### 4. Frontend Deployment Automation

Deployment is automated through cross-platform scripts (`scripts/deploy-frontend.mjs` and `scripts/deploy-frontend.sh`):

```bash
# 1. From the frontend directory:
cd frontend
npm run deploy

# Or pass explicit S3 bucket and CloudFront distribution targets:
npm run deploy -- --bucket weatherly-dev-frontend-123456789012 --distribution-id E1234EXAMPLE
```

The deployment pipeline performs:
1. **AWS Identity Verification:** Verifies active credentials (`aws sts get-caller-identity`). If credentials are missing, deployment terminates safely without modifying cloud resources.
2. **Target Discovery:** Automatically extracts the provisioned S3 bucket name and CloudFront distribution ID from `infra/terraform` outputs if not explicitly passed as arguments or environment variables.
3. **Production Build:** Executes `tsc -b && vite build` inside `frontend/`.
4. **Hashed Assets Upload:** Syncs `dist/assets` with `Cache-Control: public, max-age=31536000, immutable`.
5. **Root Files Upload:** Syncs `dist/index.html` and other root files with `Cache-Control: public, max-age=0, must-revalidate`. Excludes `.env` files and backend files.
6. **CloudFront Invalidation:** Dispatches an invalidation for `/index.html` and `/` so global edge locations serve the updated release immediately.

### 5. Production Auth0 Configuration

When deploying the frontend to CloudFront:
1. Copy the provisioned `frontend_url` output from Terraform (e.g. `https://d12345abcdef.cloudfront.net`).
2. In your Auth0 Application Settings, add the CloudFront URL to:
   - **Allowed Callback URLs:** `https://<cloudfront-domain>`
   - **Allowed Logout URLs:** `https://<cloudfront-domain>`
   - **Allowed Web Origins:** `https://<cloudfront-domain>`
3. The frontend `main.tsx` dynamically uses `window.location.origin` for the Auth0 `redirect_uri`, requiring zero code changes between local development and CloudFront hosting.

### 6. Least-Privilege IAM Security Model

- **No Managed Admin Policies:** Custom inline policies are attached directly to execution roles.
- **Strictly Scoped ARNs:** CloudWatch logging permissions (`logs:CreateLogStream`, `logs:PutLogEvents`) are locked down to the exact log group ARN. DynamoDB permissions are strictly bounded to the table ARN and index ARN (`${aws_dynamodb_table.alerts.arn}/index/GSI1`).
- **Worker Isolation:** The Scheduled Worker Lambda is only granted `dynamodb:Query` on GSI1 and base table, and `dynamodb:GetItem`/`dynamodb:PutItem` for deduplication records. It cannot scan or wipe user tables.
- **API Isolation:** The API Lambda has no permission to query GSI1 or modify system-wide configurations.

### 7. Configuration Variables & Secrets

Input variables are defined in `variables.tf`. For deployment, copy the example file:

```bash
cp infra/terraform/environments/dev/terraform.tfvars.example infra/terraform/environments/dev/terraform.tfvars
```

Key variables configured in `terraform.tfvars`:
- `aws_region`: AWS target region (default: `us-east-1`).
- `environment`: Deployment stage (default: `dev`).
- `project_name`: Resource naming prefix (default: `weatherly`).
- `frontend_origin`: Allowed CORS origin for the frontend (e.g. `https://weatherly.example.com`).
- `auth0_domain`: Auth0 tenant domain for JWT verification (e.g. `dev-tenant.us.auth0.com`).
- `auth0_audience`: Auth0 API audience identifier (e.g. `https://weather-analytics-api`).
- `gemini_api_key`: (Optional, `sensitive = true`) Google Gemini API key for AI Copilot. Defaults to `""` (copilot uses deterministic fallback).
- `gemini_model`: Generative AI model name (default: `gemini-1.5-flash`).
- `worker_schedule_expression`: EventBridge schedule rate/cron (default: `rate(1 hour)`).
- `cloudfront_price_class`: CloudFront edge distribution price tier (default: `PriceClass_100`).
- `frontend_html_cache_ttl`: Default cache TTL for index.html (default: `0`).

### 8. Deployment & Lifecycle Commands

Before planning or deploying, build the backend distribution artifacts:
```bash
# 1. Build backend TypeScript source into dist/
cd backend
npm run build
cd ..

# 2. Initialize Terraform and download providers
cd infra/terraform
terraform init

# 3. Format & validate configuration
terraform fmt -check
terraform validate

# 4. Generate and inspect an execution plan
terraform plan -var-file=environments/dev/terraform.tfvars -out=tfplan

# 5. Apply the plan to provision resources
terraform apply tfplan

# 6. Retrieve outputs (API URL, CloudFront URL, table name, ARNs)
terraform output

# 7. Deploy frontend to S3 and invalidate CloudFront
cd ../../frontend
npm run deploy
```

### 9. Cleanup & Resource Teardown

To tear down all provisioned cloud resources cleanly:
```bash
cd infra/terraform
terraform destroy -var-file=environments/dev/terraform.tfvars
```
This cleanly removes all CloudFront distributions, S3 buckets, Lambda functions, Function URLs, EventBridge rules, CloudWatch log groups, and DynamoDB tables.

### 10. Cost Estimation (AWS Free Tier Optimization)

Weatherly's serverless architecture is designed to operate within the **AWS Free Tier** and incur **$0 / month when idle**:

- **Amazon CloudFront:** AWS perpetually provides 1 TB of data transfer out and 10,000,000 HTTP/HTTPS requests per month free.
- **Amazon S3:** Standard storage includes 5 GB of standard storage, 20,000 GET requests, and 2,000 PUT requests per month during AWS free tier.
- **DynamoDB:** `PAY_PER_REQUEST` (on-demand) billing incurs zero cost when not in use. AWS Free Tier includes 25 GB of storage, 25 WCU, and 25 RCU perpetually.
- **AWS Lambda:** 1,000,000 free requests per month and 3,200,000 seconds of compute time per month perpetually.
- **Lambda Function URLs:** Function URLs have **$0 additional charge** (unlike API Gateway HTTP/REST APIs which charge after free tier). You only pay for standard Lambda execution time and data transfer.
- **Amazon EventBridge:** Scheduled rules (1 rule running every hour = ~720 invocations/month) are well within the perpetually free limit.
- **Amazon CloudWatch Logs:** 5 GB of ingestion and 5 GB of storage are included free perpetually. Log groups have a 14-day TTL retention to ensure older logs are automatically expunged.

### 11. State Management Strategy & Remote Migration

By default, Terraform is configured with a **local backend** (`terraform.tfstate` in `infra/terraform/`), making it frictionless to test and validate without requiring prior AWS bootstrapping.

#### Migrating to Remote S3 + DynamoDB Locking:
For production multi-developer workflows, migrate state to Amazon S3 with DynamoDB state locking by updating `infra/terraform/versions.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "weatherly/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```
Run `terraform init -migrate-state` to migrate existing local state into S3.

---

## GitHub Actions CI/CD with AWS OIDC

Weatherly features automated, secure CI/CD pipelines powered by GitHub Actions and AWS OpenID Connect (OIDC). Long-lived AWS access keys are **never** stored in GitHub secrets; instead, GitHub Actions assumes temporary, scoped AWS IAM credentials via OIDC web identity tokens.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               GitHub Actions CI/CD Pipeline                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   Pull Request / Commit Push (main)                                                    │
│       │                                                                                │
│       ▼                                                                                │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ CI Workflow (.github/workflows/ci.yml)                                         │   │
│   │ ├─ Backend: npm ci ➔ npm test (221 tests) ➔ npm run build                      │   │
│   │ ├─ Frontend: npm ci ➔ oxlint (0 errors) ➔ npm test (41 tests) ➔ vite build    │   │
│   │ └─ Terraform: terraform fmt -check ➔ terraform validate                        │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │ CI Passed & Merged to main                 │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Deployment Workflow (.github/workflows/deploy.yml)                             │   │
│   │ 1. Package Lambda: Staged backend with production node_modules                 │   │
│   │ 2. AWS OIDC Authentication: Assume role via token.actions.githubusercontent.com│   │
│   │ 3. Terraform Plan: Speculative plan artifact review                            │   │
│   │ 4. Environment Gate: GitHub Environment 'production' (manual approval)         │   │
│   │ 5. Terraform Apply: Provisions/updates Lambda, DynamoDB, S3, and CloudFront    │   │
│   │ 6. Frontend Build: Compiles React SPA with dynamic API Lambda URL              │   │
│   │ 7. S3 Sync & Invalidate: Hashed assets (1-yr cache), HTML (revalidate)         │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Workflows Summary

| Workflow | File | Triggers | Responsibilities |
|---|---|---|---|
| **Continuous Integration** | `.github/workflows/ci.yml` | `pull_request` (main), `push` (main) | Parallel verification: Backend tests/build, Frontend lint/tests/build, Terraform format/syntax validation. |
| **Production Deployment** | `.github/workflows/deploy.yml` | `push` (main), `workflow_dispatch` | Controlled release: Package Lambda, OIDC auth, Terraform plan/apply with environment approval, S3 sync, CloudFront invalidation. |

### 2. AWS Authentication via GitHub OIDC

The deployment pipeline uses AWS OIDC federation, eliminating static credential management:
- **OIDC Provider:** `token.actions.githubusercontent.com` (managed in `infra/terraform/oidc.tf`).
- **Strict Trust Boundary:** The role assumption trust policy strictly enforces both the audience and exact repository:
  ```json
  {
    "Effect": "Allow",
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Principal": { "Federated": "arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com" },
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": [
          "repo:Dama-27/weatherly:ref:refs/heads/main",
          "repo:Dama-27/weatherly:environment:production"
        ]
      }
    }
  }
  ```
- **Scoped Deployment Permissions:** The IAM role (`weatherly-dev-github-actions-deploy-role`) is restricted strictly to Weatherly resource prefixes (`weatherly-*`), including S3, CloudFront invalidations, Lambda functions, DynamoDB tables, and CloudWatch log groups.

### 3. GitHub Repository Configuration Checklist

To activate automated deployment in your repository:

1. **Initial Terraform Provisioning:**
   Run Terraform locally once to provision the OIDC provider and deployment role:
   ```bash
   cd infra/terraform
   terraform plan -var-file=environments/dev/terraform.tfvars
   terraform apply
   ```
   Note the output `github_oidc_role_arn`.

2. **Configure GitHub Environment:**
   - In GitHub, navigate to **Settings** ➔ **Environments** ➔ **New environment**.
   - Name: `production`.
   - Under **Deployment protection rules**, enable **Required reviewers** to require approval before infrastructure changes are applied.

3. **Configure GitHub Repository Secrets & Variables:**
   Navigate to **Settings** ➔ **Secrets and variables** ➔ **Actions**:
   - **Secrets:**
     - `AWS_OIDC_ROLE_ARN`: Output from Terraform `github_oidc_role_arn` (e.g. `arn:aws:iam::123456789012:role/weatherly-dev-github-actions-deploy-role`).
     - `AUTH0_DOMAIN`: Your Auth0 domain (e.g. `dev-tenant.us.auth0.com`).
     - `AUTH0_CLIENT_ID`: Your Auth0 Single-Page App client ID.
     - `AUTH0_AUDIENCE`: Your Auth0 API audience identifier (`https://weather-analytics-api`).
     - `GEMINI_API_KEY`: (Optional) Google Gemini API key for Copilot.
   - **Variables:**
     - `AWS_REGION`: Target AWS region (default: `us-east-1`).

### 4. Lambda Packaging & Artifact Integrity

- **Reproducible Production Packaging:** Executed via `scripts/package-lambda.mjs` (`npm run package` in `backend/`).
- Staged into `backend/.lambda-package/` containing:
  - Compiled JavaScript (`dist/lambda.js`, `dist/workers/scheduled-alerts.worker.js`).
  - Production-only dependencies (`npm ci --omit=dev --no-audit`).
- Terraform's `archive_file` data source packages this directory dynamically, generating an exact SHA-256 hash to trigger Lambda updates only when code or dependencies change.

### 5. Troubleshooting & Diagnostics

- **OIDC Error `Not authorized to perform sts:AssumeRoleWithWebIdentity`:**
  - Verify that `github_repository` in `terraform.tfvars` matches your exact GitHub repository path (case-sensitive, e.g. `Dama-27/weatherly`).
  - Verify that the workflow branch is `refs/heads/main` or running in the `production` environment.
- **Terraform Plan Drift / Missing Variables:**
  - Ensure all required secrets (`AUTH0_DOMAIN`, `AUTH0_AUDIENCE`) are populated in GitHub repository secrets.
- **Frontend S3 Access Denied (403):**
  - Verify that CloudFront OAC is attached and the S3 bucket policy references the exact CloudFront distribution ARN.

---

## Production Observability, Monitoring & Operations

Weatherly incorporates enterprise-grade operational instrumentation designed for AWS serverless execution, providing deep visibility while guaranteeing data privacy and security.

### 1. CloudWatch Structured JSON Logging

Both the Express API Lambda and Scheduled Worker Lambda output uniform, single-line JSON logs directly to CloudWatch Logs:

```json
{
  "timestamp": "2026-11-06T12:00:00.123Z",
  "level": "INFO",
  "service": "weatherly-api",
  "correlationId": "5d13bf4a-e9e7-4af4-8a82-794bc372beab",
  "requestId": "c1234567-89ab-cdef-0123-456789abcdef",
  "operation": "GET /api/weather/current",
  "durationMs": 42,
  "status": "success",
  "statusCode": 200,
  "metadata": {
    "method": "GET",
    "path": "/weather/current",
    "query": { "lat": "6.93", "lon": "79.86" }
  }
}
```

#### Key Capabilities:
- **Request Tracing:** Propagates `X-Correlation-Id` across frontend API requests, Lambda handlers, and internal services.
- **Lambda Request ID:** Extracts and logs `context.awsRequestId` for immediate correlation with AWS Lambda runtime logs.
- **Categorized Error Telemetry:** When failures occur, logs classify errors into standardized operational categories (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `RateLimitError`, `UpstreamTimeout`, `UpstreamHttpError`, `StorageError`, `InternalError`).
- **Privacy & Security Redaction:**
  - JWT tokens are automatically detected and replaced with `[REDACTED_JWT]`.
  - Sensitive HTTP headers (`authorization`, `cookie`, `set-cookie`) are scrubbed before logging.
  - Query parameters and request payload keys matching passwords, secrets, API keys, or tokens are masked as `[REDACTED]`.
  - User personal identifying information (PII) is never logged.

### 2. Operational CloudWatch Metric Alarms

Provisioned via `infra/terraform/cloudwatch_alarms.tf`:

| Metric Alarm | Target Resource | Threshold & Period | Operational Meaning |
|---|---|---|---|
| **`api-unhandled-errors`** | `weatherly-dev-api` | Sum $\ge 1$ (5 mins) | Detects unhandled exceptions, crashes, or 500-series server faults. |
| **`worker-unhandled-errors`** | `weatherly-dev-scheduled-worker` | Sum $\ge 1$ (5 mins) | Flags unexpected errors in the background alert evaluation worker. |
| **`api-throttles`** | `weatherly-dev-api` | Sum $\ge 1$ (5 mins) | Detects API traffic exceeding AWS account concurrency limits. |
| **`worker-throttles`** | `weatherly-dev-scheduled-worker` | Sum $\ge 1$ (5 mins) | Flags worker execution throttling. |
| **`api-duration-approaching-timeout`** | `weatherly-dev-api` | Max $\ge 12\text{s}$ (80% of 15s) | Warns when API latency risks timing out before response dispatch. |
| **`worker-duration-approaching-timeout`** | `weatherly-dev-scheduled-worker` | Max $\ge 48\text{s}$ (80% of 60s) | Warns when batch evaluation duration approaches the worker execution ceiling. |
| **`dynamodb-throttled-requests`** | `weatherly-dev-alerts` | Sum $\ge 1$ (5 mins) | Identifies partition hotspotting or burst throttling on the DynamoDB table. |
| **`worker-dlq-messages`** | `weatherly-dev-worker-dlq` | Sum $\ge 1$ (5 mins) | Alerts on dropped events landing in the Dead-Letter Queue after 2 retries. |

*Alarm notifications can be routed directly to an operational email or pager by configuring `alarm_sns_topic_arn` in `terraform.tfvars`.*

### 3. Reliability & Dead-Letter Handling

- **EventBridge Retry Policy:** The scheduled rule retries failed worker dispatches up to 2 times within 1 hour (`maximum_retry_attempts = 2`, `maximum_event_age_in_seconds = 3600`).
- **SQS Dead-Letter Queue (DLQ):** If retries are exhausted, dropped events are preserved in `weatherly-dev-worker-dlq` with 14-day retention for post-mortem analysis.
- **Upstream Timeouts & Circuit Breaking:** Open-Meteo requests enforce an 8-second timeout (`AbortSignal.timeout(8000)`) with clear 504 Gateway Timeout error mappings.
- **Graceful AI Fallback:** Google Gemini generative calls enforce strict timeouts (8000ms) and quota (429) guards, falling back instantaneously to deterministic rule-based evaluation without user disruption.
- **DynamoDB Deduplication:** Checks `hasEvaluationRecord()` before persisting triggered alerts to eliminate duplicate browser notifications for the same forecast window.

### 4. CloudWatch Logs Insights Queries

Run these operational queries in the CloudWatch Logs console (`/aws/lambda/weatherly-dev-api`):

#### Find Recent Application Errors:
```sql
fields @timestamp, correlationId, operation, statusCode, errorCategory, errorMessage
| filter level = "ERROR" or statusCode >= 400
| sort @timestamp desc
| limit 50
```

#### Latency Percentiles (p50, p95, p99) by Endpoint:
```sql
fields operation, durationMs
| stats count() as requests, pct(durationMs, 50) as p50, pct(durationMs, 95) as p95, pct(durationMs, 99) as p99, max(durationMs) as maxDuration by operation
| sort requests desc
```

#### Track Worker Alert Evaluation Throughput:
```sql
fields @timestamp, metadata.processedAlerts, metadata.triggeredAlerts, metadata.deduplicatedAlerts, durationMs
| filter service = "weatherly-worker" and status = "success"
| sort @timestamp desc
| limit 20
```

### 5. Production Security & Secrets Management

- **Zero Secrets in Code:** No credentials or API keys are stored in source repositories.
- **AWS Secrets Recommendation for Gemini API Key:**
  For production deployments, store your Gemini API key in **AWS Systems Manager Parameter Store** as an encrypted `SecureString`:
  ```bash
  aws ssm put-parameter \
    --name "/weatherly/prod/gemini_api_key" \
    --value "your_actual_gemini_api_key" \
    --type SecureString \
    --overwrite
  ```
  Or in **AWS Secrets Manager**, referencing the parameter directly in Lambda environment variables or retrieving it during Lambda cold starts.
- **Frontend Token Isolation:** Authentication tokens are stored exclusively in memory via `@auth0/auth0-react`. No tokens or sensitive user data are ever written to `localStorage`.
- **S3 Public Access:** S3 bucket has all public access blocked; content is accessible strictly via CloudFront SigV4 Origin Access Control (OAC).

### 6. Cost Management & Budgeting

Weatherly is designed to operate within the **AWS Free Tier** and incur **$0 / month when idle**, but production workloads may incur charges when exceeding free tier limits:

| AWS Service | Free Tier Allowance (Perpetual / 12-Mo) | Potential Billable Thresholds |
|---|---|---|
| **AWS Lambda** | 1,000,000 requests & 3,200,000 seconds / month | \$0.20 per 1M requests; \$0.0000166667 per GB-second |
| **Amazon DynamoDB** | 25 GB storage, 25 WCU, 25 RCU | \$1.25 per 1M write units; \$0.25 per 1M read units |
| **Amazon CloudFront** | 1 TB data transfer out & 10,000,000 HTTP/S requests / month | \$0.085/GB data transfer (US/Europe) |
| **Amazon S3** | 5 GB storage, 20,000 GETs, 2,000 PUTs (First 12 months) | \$0.023 per GB-month storage |
| **CloudWatch Logs** | 5 GB ingestion & 5 GB storage | \$0.50 per GB ingested |
| **CloudWatch Alarms** | 10 standard metric alarms free | \$0.10 per alarm / month beyond 10 |

#### AWS Budget Alert Setup:
To prevent unexpected spend, configure an AWS Cost Budget in the AWS Billing Console:
1. Navigate to **Billing and Cost Management** ➔ **Budgets** ➔ **Create budget**.
2. Select **Cost budget** with a monthly threshold of **\$10.00**.
3. Set alert thresholds at 80% (\$8.00) and 100% (\$10.00) notifying your operations email.

---

## Environment Configuration

### Backend (`backend/.env`)
Create `backend/.env` using the following reference:
```env
PORT=3000
WEATHER_PROVIDER=open-meteo
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://weather-analytics-api

# Optional: only needed if WEATHER_PROVIDER=openweathermap
OPENWEATHER_API_KEY=your_openweathermap_key_here

# Optional: enables Google Gemini AI Copilot (defaults to deterministic rule engine if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

---

## AI Weather Copilot & Deterministic Fallback

The Weatherly Copilot answers natural-language inquiries regarding weather conditions, outdoor activities, clothing choices, and comfort metrics.

### Key Capabilities:
- **Provider-Independent Architecture (`IAssistantProvider`):** Isolates generative AI providers behind a unified contract.
- **Primary AI Provider (Google Gemini):** Integrates free-tier Gemini models via secure backend REST API with strict grounding, 8-second timeout, and non-hallucination guardrails. Never exposes API keys to client browsers.
- **Deterministic Meteorological Fallback:** If `GEMINI_API_KEY` is omitted, or if rate limits (429), timeouts, or upstream provider errors occur, the copilot automatically falls back to an algorithmic rules engine.
- **Supported Question Topics:**
  - Running, walking, cycling, and outdoor sport suitability.
  - Precipitation, rain likelihood, and umbrella necessity (today and tomorrow).
  - Clothing, attire, rain gear, and UV sun protection advice.
  - Comfort Index score explanations and active risk factor breakdowns.
  - Optimal outdoor time windows.
- **Session Privacy:** Conversation logs remain strictly ephemeral within the active browser session. No chat histories or authentication tokens are persisted into localStorage.

### Frontend (`frontend/.env`)
Create `frontend/.env` using the following reference:
```env
VITE_API_TARGET_URL=http://localhost:3000
VITE_API_URL=/api
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_auth0_client_id_here
VITE_AUTH0_AUDIENCE=https://weather-analytics-api
```

---

## Local Development Instructions

### Prerequisites
- Node.js (v20+ or v24 LTS recommended)
- npm

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
The backend server runs on `http://localhost:3000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend Vite server runs on `http://localhost:5173`. API requests (`/api/*`) are proxied automatically to `http://localhost:3000`.

---

## Test & Quality Verification Commands

### Backend
Execute the Vitest suite and compile TypeScript:
```bash
cd backend
npm test        # Runs all 23 test suites (221 unit & integration tests)
npm run build   # Typechecks and builds backend (server.js, lambda.js, workers) with tsc
```

### Frontend
Execute linting, unit tests, and production build:
```bash
cd frontend
npm run lint    # Runs oxlint static analysis (0 errors, 0 warnings across 30 files)
npm test        # Runs unit tests via Node native test runner (17 suites, 37 tests)
npm run build   # Typechecks (tsc -b) and bundles production client with Vite
```

---

## Weather Data Attribution

Weather forecast data and geocoding services are provided by **[Open-Meteo](https://open-meteo.com/)** under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license. Open-Meteo utilizes open weather model data from national weather services including ECMWF, NOAA, DWD, and JMA.

---

## Known Limitations & Planned Enhancements

1. **Lambda In-Memory Cache Life-Cycle:**
   - Caching currently operates in-process using `node-cache` per Lambda warm container instance. Across horizontal Lambda scalings or cold starts, cache entries do not persist. Centralized DynamoDB and Redis caching are slated for upcoming Day 3 milestones.
2. **Cloud Infrastructure & Provisioning:**
   - Serverless infrastructure is fully automated with Terraform (`infra/terraform/`), including DynamoDB with GSI1, API Lambda with Function URL, scheduled EventBridge alerts worker, and CloudWatch log groups. Automated CI/CD deployment pipelines (GitHub Actions) can be layered on top in subsequent milestones.
3. **Offline / Service Worker Support:**
   - Client requires an active internet connection for real-time forecast and search updates. Progressive Web App (PWA) offline caching is slated for future enhancement.
4. **Geocoding Disambiguation:**
   - Open-Meteo geocoding search results prioritize by population; small localities with identical names may require country or region filtering.
