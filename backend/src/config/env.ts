import 'dotenv/config';
import process from 'process';

const port = Number(process.env.PORT ?? 3000);
const weatherProvider = (process.env.WEATHER_PROVIDER ?? 'open-meteo').toLowerCase();
const openWeatherApiKey = process.env.OPENWEATHER_API_KEY ?? '';
const auth0Domain = process.env.AUTH0_DOMAIN ?? '';
const auth0Audience = process.env.AUTH0_AUDIENCE ?? '';

if (weatherProvider === 'openweathermap' && !openWeatherApiKey) {
  throw new Error('OPENWEATHER_API_KEY is not configured for OpenWeatherMap provider.');
}

// Check Auth0 configuration in non-test runtime environments
if (process.env.NODE_ENV !== 'test' && (!auth0Domain || !auth0Audience)) {
  console.warn(
    'Warning: AUTH0_DOMAIN and AUTH0_AUDIENCE should be configured in backend/.env'
  );
}

export const env = {
  port,
  weatherProvider,
  openWeatherApiKey,
  auth0Domain,
  auth0Audience,
};
