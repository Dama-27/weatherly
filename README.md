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
2. **Cloud Infrastructure:**
   - The backend is now fully Lambda-ready with `@codegenie/serverless-express` (`dist/lambda.handler`). Infrastructure as code (Terraform/CDK) and DynamoDB tables will be provisioned in subsequent Day 3 milestones.
3. **Offline / Service Worker Support:**
   - Client requires an active internet connection for real-time forecast and search updates. Progressive Web App (PWA) offline caching is slated for future enhancement.
4. **Geocoding Disambiguation:**
   - Open-Meteo geocoding search results prioritize by population; small localities with identical names may require country or region filtering.
