import 'dotenv/config';
import process from 'process';

const port = Number(process.env.PORT ?? 3000);
const nodeEnv = process.env.NODE_ENV ?? 'development';
const weatherProvider = (process.env.WEATHER_PROVIDER ?? 'open-meteo').toLowerCase();
const openWeatherApiKey = process.env.OPENWEATHER_API_KEY ?? '';
const auth0Domain = process.env.AUTH0_DOMAIN ?? '';
const auth0Audience = process.env.AUTH0_AUDIENCE ?? '';
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
const geminiApiKey = process.env.GEMINI_API_KEY ?? '';
const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
const awsRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
const dynamoDbTableName = process.env.DYNAMODB_TABLE_NAME ?? 'weatherly-alerts';
const dynamoDbGsiName = process.env.DYNAMODB_GSI_NAME ?? 'GSI1';
const alertPersistence = (
  process.env.ALERT_PERSISTENCE ??
  (process.env.DYNAMODB_TABLE_NAME ? 'dynamodb' : 'memory')
).toLowerCase();

if (weatherProvider === 'openweathermap' && !openWeatherApiKey) {
  throw new Error('OPENWEATHER_API_KEY is not configured for OpenWeatherMap provider.');
}

// Check Auth0 configuration in non-test runtime environments
if (nodeEnv !== 'test' && (!auth0Domain || !auth0Audience)) {
  console.warn(
    'Warning: AUTH0_DOMAIN and AUTH0_AUDIENCE should be configured in backend/.env'
  );
}

export const env = {
  port,
  nodeEnv,
  weatherProvider,
  openWeatherApiKey,
  auth0Domain,
  auth0Audience,
  frontendOrigin,
  geminiApiKey,
  geminiModel,
  awsRegion,
  dynamoDbTableName,
  dynamoDbGsiName,
  alertPersistence,
};
