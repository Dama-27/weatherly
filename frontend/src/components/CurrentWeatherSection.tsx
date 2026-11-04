import WeatherIcon from './WeatherIcon';
import type { CurrentWeather, DailyForecast } from '../types/weather';
import type { WeatherTheme } from '../utils/weather-theme';

interface CurrentWeatherSectionProps {
  weather: CurrentWeather;
  todayForecast?: DailyForecast;
  theme?: WeatherTheme;
}

export default function CurrentWeatherSection({
  weather,
  todayForecast,
  theme,
}: CurrentWeatherSectionProps) {
  // Format observation time
  const formatObservationTime = (isoString: string, timezone?: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone && timezone !== 'UTC' ? timezone : undefined,
      }).format(date);
    } catch {
      return new Date(isoString).toLocaleString();
    }
  };

  const highTemp = todayForecast?.maxTemperatureCelsius;
  const lowTemp = todayForecast?.minTemperatureCelsius;

  return (
    <section
      className="current-weather-hero"
      style={
        theme
          ? {
              background: theme.heroGradient,
              color: theme.heroText,
            }
          : undefined
      }
    >
      <div className="hero-primary">
        <div className="location-heading">
          <h2>{weather.location.name}</h2>
          {weather.location.country && (
            <span
              className="location-country"
              style={theme ? { color: theme.heroSubtext } : undefined}
            >
              {weather.location.country}
            </span>
          )}
          <p
            className="observation-time"
            style={theme ? { color: theme.heroSubtext } : undefined}
          >
            {formatObservationTime(weather.timestamp, weather.location.timezone)}
          </p>
        </div>

        <div className="temperature-display">
          <div className="temp-main">
            <span className="temp-value">{Math.round(weather.temperatureCelsius)}</span>
            <span className="temp-unit">°C</span>
          </div>

          <div className="temp-details">
            <span
              className="feels-like"
              style={theme ? { color: theme.heroSubtext } : undefined}
            >
              Feels like <strong>{Math.round(weather.feelsLikeCelsius)}°C</strong>
            </span>
            {(highTemp != null || lowTemp != null) && (
              <span
                className="high-low"
                style={theme ? { color: theme.heroSubtext } : undefined}
              >
                {highTemp != null && <span>H: {Math.round(highTemp)}°</span>}
                {highTemp != null && lowTemp != null && <span> · </span>}
                {lowTemp != null && <span>L: {Math.round(lowTemp)}°</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="hero-secondary">
        <WeatherIcon
          conditionCode={weather.conditionCode}
          isDay={weather.isDay}
          size={88}
          className="hero-weather-icon"
          description={weather.description}
        />
        <span className="weather-desc">{weather.description}</span>
      </div>
    </section>
  );
}
