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
  - Security & Auth: `express-oauth2-jwt-bearer`
  - Caching: `node-cache` (TTL-based in-memory cache)
  - Testing: Vitest
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

## Comfort Index Formula

The heuristic Comfort Score (0–100) evaluates four surface parameters:
```text
Comfort Score = (Temperature Score * 0.50) + (Humidity Score * 0.30) + (Wind Score * 0.10) + (Rain Score * 0.10)
```

- **Feels-Like Temperature (50%):** Ideal range 24°C–26°C (score 100). Drops gradually outside this zone.
- **Humidity (30%):** Ideal range 40%–60% (score 100). Penalizes dry air and high humidity.
- **Wind Speed (10%):** Ideal range 5–15 km/h (score 100). Calm air scores 60; strong winds (>30 km/h) are penalized.
- **Rain (10%):** 0 mm scores 100; precipitation progressively lowers the score.

---

## Personalized Weather Alerts & Notifications (MVP)

Weatherly allows users to configure personal weather condition alerts:
- **Temperature Thresholds:** Above or below a target value (°C).
- **Rain Probability:** Exceeding a specified likelihood (%).
- **UV Index:** Exceeding target exposure limit.
- **Wind Speed:** Exceeding maximum comfort/safety speeds (km/h).
- **Severe Weather Forecasts:** Thunderstorm activity (WMO 95, 96, 99) and heavy downpour/precipitation.

### MVP Architecture & Storage:
- **Rule Persistence:** Stored in browser `localStorage` scoped by authenticated Auth0 user ID (`weatherly_alerts_${userId}`) or guest fallback (`weatherly_alerts_guest`). No tokens or sensitive credentials are ever written.
- **Evaluation Engine:** Backend service (`POST /api/weather/alerts/evaluate`) deterministically evaluates active rules against current conditions and 24-hour hourly forecast timelines.
- **Deduplication:** At most one notification is triggered per rule and time window.
- **Browser Notifications:** Utilizes the HTML5 Notifications API with explicit user opt-in (`default`, `granted`, `denied`, `unsupported`).
- **Operational Limitation:** In this MVP, alerts and browser notifications are evaluated client-side when Weatherly is open and actively refreshing weather data. They do not constitute guaranteed real-time emergency civil warnings.

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
```

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
npm test        # Runs all 11 test suites (75 unit & integration tests)
npm run build   # Typechecks and builds backend with tsc
```

### Frontend
Execute linting, unit tests, and production build:
```bash
cd frontend
npm run lint    # Runs oxlint static analysis
npm test        # Runs unit tests via Node native test runner (node:test)
npm run build   # Typechecks (tsc -b) and bundles production client with Vite
```

---

## Weather Data Attribution

Weather forecast data and geocoding services are provided by **[Open-Meteo](https://open-meteo.com/)** under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license. Open-Meteo utilizes open weather model data from national weather services including ECMWF, NOAA, DWD, and JMA.

---

## Known Limitations & Planned Enhancements

1. **In-Memory Caching:**
   - Caching is managed in-process using `node-cache`. Cache entries do not persist across process restarts. Shared Redis caching is recommended for multi-instance production environments.
2. **Cloud Infrastructure:**
   - AWS infrastructure (ECS/Lambda, S3/CloudFront, API Gateway, CDK/Terraform) has not yet been provisioned and is scheduled for subsequent deployment milestones.
3. **Offline / Service Worker Support:**
   - Client requires an active internet connection for real-time forecast and search updates. Progressive Web App (PWA) offline caching is slated for future enhancement.
4. **Geocoding Disambiguation:**
   - Open-Meteo geocoding search results prioritize by population; small localities with identical names may require country or region filtering.
