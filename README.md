# Weatherly

A full-stack weather analytics application built for the Fidenz Training Software Engineer assignment.

The application fetches current weather data for a list of cities from the OpenWeatherMap API, calculates a custom Comfort Index score (from 0 to 100) on the backend using four weather parameters, and ranks the cities from most comfortable to least comfortable. The dashboard is built with React and TypeScript, fully responsive, and secured with Auth0 authentication on both the frontend and backend.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, `@auth0/auth0-react`
- **Backend:** Node.js, Express, TypeScript, `express-oauth2-jwt-bearer`, `node-cache`
- **Testing:** Vitest
- **External Services:** OpenWeatherMap API, Auth0

---

## Features

- **City List:** Loads city IDs and names from `data/cities.json`.
- **Weather Integration:** Calls OpenWeatherMap API (`/data/2.5/weather?id={cityCode}`) to get live temperature, feels-like temperature, humidity, wind speed, and rain.
- **Backend Comfort Index:** Calculates a 0–100 integer score evaluating how comfortable the weather feels for each city.
- **City Ranking:** Sorts cities by comfort score and assigns ranks (Rank 1 = best conditions).
- **Two-Level In-Memory Caching (5-minute TTL):**
  - Caches raw weather data per city (`weather:{cityCode}`) to avoid redundant API calls.
  - Caches the final processed ranking list (`weather:analytics`) for fast responses.
  - Endpoints to inspect cache hit/miss statistics and manually clear the cache.
- **Auth0 Security:**
  - Frontend Single Page App login using PKCE flow.
  - Backend API protected with JWT Bearer token validation (RS256 signature, audience, and issuer verification).
  - Tokens kept in memory by the Auth0 SDK to avoid XSS storage vulnerabilities.
- **Responsive Dashboard:**
  - Desktop: Full data table with all metrics and comfort score.
  - Mobile: Card-based view with clean layout on smaller screens.
  - Sorting: Sort cities by Rank, Comfort Score, Temperature, or City Name.
- **Automated Tests:** Unit tests covering the Comfort Index calculation, ideal values, extreme weather penalties, and integer range bounds.

---

## Comfort Index Formula

The comfort calculation is implemented on the backend in `backend/src/services/comfort-index.service.ts`.

It uses four normalized weather parameters with weighted contributions:

```text
Comfort Score = (Temperature Score * 0.50) + (Humidity Score * 0.30) + (Wind Score * 0.10) + (Rain Score * 0.10)
```

The final score is clamped between 0 and 100 and rounded to the nearest integer.

### Parameter Breakdown

| Parameter | Weight | Ideal Condition (Score 100) | How It Is Scored |
|---|---|---|---|
| **Feels-Like Temperature** | 50% | 24°C – 26°C | Drops gradually as temperature moves away from the ideal range. Temperatures below 5°C or above 36°C score 0. |
| **Humidity** | 30% | 40% – 60% | Ideal range gives 100. Higher humidity (muggy) and very low humidity (dry) reduce the score. |
| **Wind Speed** | 10% | 5 – 15 km/h | Light breeze scores 100. Calm air scores 60, while strong winds (>30 km/h) reduce the score. |
| **Rain (Past 1 Hour)** | 10% | 0 mm | Dry conditions give 100. Any rain decreases the score, with heavy rain (>10 mm) scoring 5. |

### Testing Live Parameter Changes (Video Recording)

To demonstrate how the ranking adapts to parameter changes:
1. Open `backend/src/services/comfort-index.service.ts`.
2. Change the weights (for example, set the temperature weight to `0.70` and humidity to `0.10`).
3. Send a request to `DELETE /api/cache` (or restart the backend server) to clear the cached results.
4. Refresh the frontend to see the updated city rankings.

---

## API Endpoints

Base URL: `http://localhost:3000`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/health` | Server health check | No |
| GET | `/api/weather` | Returns ranked weather data and comfort scores | Yes (Bearer token) |
| GET | `/api/cache/status` | Returns cache statistics (hits, misses, cached keys) | Yes (Bearer token) |
| DELETE | `/api/cache` | Clears the cache and resets statistics | Yes (Bearer token) |

Protected endpoints expect the Auth0 Access Token in the request header:
```text
Authorization: Bearer <access_token>
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- OpenWeatherMap API key
- Auth0 account with a Single Page Application and API configured

---

### Backend Setup

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file in the `backend/` folder (or copy from `.env.example`):
   ```env
   PORT=3000
   OPENWEATHER_API_KEY=your_openweathermap_api_key_here
   AUTH0_DOMAIN=your-tenant.us.auth0.com
   AUTH0_AUDIENCE=https://weather-analytics-api
   ```

3. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will start on `http://localhost:3000`.

4. Run backend tests:
   ```bash
   npm test
   ```

5. Build backend:
   ```bash
   npm run build
   ```

---

### Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Create a `.env` file in the `frontend/` folder (or copy from `.env.example`):
   ```env
   VITE_API_TARGET_URL=http://localhost:3000
   VITE_API_URL=/api
   VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
   VITE_AUTH0_CLIENT_ID=your_auth0_client_id_here
   VITE_AUTH0_AUDIENCE=https://weather-analytics-api
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The application will run on `http://localhost:5173`. The Vite proxy will route `/api/*` calls to the backend on port 3000.

4. Run lint and build checks:
   ```bash
   npm run lint
   npm run build
   ```

---

## Test User Credentials

The following pre-created test user can be used to log in:

- **Email:** `careers@fidenz.com`
- **Password:** `Pass#fidenz`

---

## Trade-offs and Limitations

1. **In-Memory Cache vs. Redis:**
   - I used `node-cache` to keep setup simple with zero extra infrastructure requirements.
   - Trade-off: The cache is stored in the Node.js process memory, so it clears if the backend restarts. In a real production deployment with multiple server instances, a shared Redis cache would be needed.

2. **5-Minute Cache TTL vs. Data Freshness:**
   - Weather data is cached for 300 seconds (5 minutes).
   - Trade-off: Weather conditions change slowly, so 5 minutes is a good balance between data accuracy and staying well within OpenWeatherMap's free tier rate limits (60 calls/minute).

3. **Comfort Formula Simplification:**
   - The Comfort Index is a heuristic based on four surface parameters (temperature, humidity, wind, rain).
   - Trade-off: Professional biometeorological indices (like PMV or UTCI) require extra metrics such as solar radiation, clothing level, and metabolic rate, which standard weather APIs do not provide. This weighted formula provides a predictable and practical 0–100 approximation.

4. **Token Storage in Memory:**
   - Auth0 access tokens are held in JavaScript memory by the Auth0 React SDK rather than in `localStorage` or `sessionStorage`.
   - Trade-off: This prevents token theft via Cross-Site Scripting (XSS). The trade-off is that tokens are re-requested silently in the background on hard page reloads.

---

## Project Structure

```text
weatherly/
├── data/
│   └── cities.json              # City list with CityCodes
├── backend/
│   ├── src/
│   │   ├── config/env.ts        # Environment variable loading & validation
│   │   ├── middleware/          # Auth0 JWT verification middleware
│   │   ├── controllers/         # Weather and cache route controllers
│   │   ├── services/            # Weather fetching, analytics, comfort scoring, cache
│   │   ├── common/              # Normalization functions for weather metrics
│   │   ├── routes/              # Express route definitions
│   │   └── types/               # TypeScript interfaces
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/          # WeatherTable, WeatherCard, UserHeader, AuthButtons, Loading
    │   ├── services/            # Weather API service with Bearer token header
    │   ├── types/               # UI weather interfaces
    │   └── App.tsx              # Main dashboard view with auth & sorting
    ├── .env.example
    ├── vite.config.ts           # Vite dev server & proxy setup
    └── package.json
```