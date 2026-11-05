import { Router } from 'express';
import {
  getCurrentWeatherByCoords,
  getDailyForecastByCoords,
  getHourlyForecastByCoords,
  getWeather,
  getWeatherIntelligenceByCoords,
} from '../controllers/weather.controller';
import { validateAccessToken } from '../middleware/auth0.middleware';

const weatherRouter = Router();

// Legacy endpoint: ranked weather data and Comfort Index (Auth0 protected)
weatherRouter.get('/weather', validateAccessToken, getWeather);

// Coordinate-based endpoints
weatherRouter.get('/weather/current', getCurrentWeatherByCoords);
weatherRouter.get('/weather/hourly', getHourlyForecastByCoords);
weatherRouter.get('/weather/daily', getDailyForecastByCoords);
weatherRouter.get('/weather/intelligence', getWeatherIntelligenceByCoords);

export default weatherRouter;
