import type { CurrentWeather } from '../types/weather';

interface WeatherMetricsGridProps {
  weather: CurrentWeather;
}

function getWindDirection(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

function getUvLevel(uv: number): { label: string; badgeClass: string } {
  if (uv < 3) return { label: 'Low', badgeClass: 'uv-low' };
  if (uv < 6) return { label: 'Moderate', badgeClass: 'uv-mod' };
  if (uv < 8) return { label: 'High', badgeClass: 'uv-high' };
  if (uv < 11) return { label: 'Very High', badgeClass: 'uv-vhigh' };
  return { label: 'Extreme', badgeClass: 'uv-extreme' };
}

export default function WeatherMetricsGrid({ weather }: WeatherMetricsGridProps) {
  const uvInfo = weather.uvIndex != null && weather.uvIndex >= 0 ? getUvLevel(weather.uvIndex) : null;
  const windDir = weather.windDirectionDegrees != null ? getWindDirection(weather.windDirectionDegrees) : null;

  return (
    <section className="weather-metrics-section">
      <h3 className="section-title">Current Conditions</h3>

      <div className="metrics-grid">
        {/* Humidity */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Humidity</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <div className="metric-body">
            <span className="metric-value">{weather.humidityPercent}%</span>
            <span className="metric-hint">
              {weather.humidityPercent > 65 ? 'High moisture' : weather.humidityPercent < 35 ? 'Dry air' : 'Comfortable'}
            </span>
          </div>
        </div>

        {/* Wind */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Wind</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
            </svg>
          </div>
          <div className="metric-body">
            <div className="wind-speed-row">
              <span className="metric-value">{Math.round(weather.windSpeedKmH)}</span>
              <span className="metric-unit">km/h</span>
              {windDir && (
                <span className="wind-direction" title={`${weather.windDirectionDegrees}°`}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ transform: `rotate(${weather.windDirectionDegrees}deg)` }}
                  >
                    <polygon points="12,2 19,21 12,17 5,21" />
                  </svg>
                  {windDir}
                </span>
              )}
            </div>
            {weather.windGustsKmH != null && weather.windGustsKmH > 0 && (
              <span className="metric-hint">Gusts up to {Math.round(weather.windGustsKmH)} km/h</span>
            )}
          </div>
        </div>

        {/* UV Index */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">UV Index</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          </div>
          <div className="metric-body">
            <div className="uv-row">
              <span className="metric-value">{weather.uvIndex != null ? Math.round(weather.uvIndex) : 'N/A'}</span>
              {uvInfo && (
                <span className={`uv-badge ${uvInfo.badgeClass}`}>
                  {uvInfo.label}
                </span>
              )}
            </div>
            <span className="metric-hint">Max sun protection needed mid-day</span>
          </div>
        </div>

        {/* Pressure */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Pressure</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="12" x2="16" y2="8" />
            </svg>
          </div>
          <div className="metric-body">
            <span className="metric-value">{Math.round(weather.pressureHpa)}</span>
            <span className="metric-unit">hPa</span>
            <span className="metric-hint">
              {weather.pressureHpa >= 1013 ? 'High pressure system' : 'Low pressure system'}
            </span>
          </div>
        </div>

        {/* Cloud Cover */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Cloud Cover</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
          </div>
          <div className="metric-body">
            <span className="metric-value">{weather.cloudCoverPercent}%</span>
            <span className="metric-hint">
              {weather.cloudCoverPercent < 20 ? 'Mostly sunny' : weather.cloudCoverPercent < 70 ? 'Partly cloudy' : 'Overcast skies'}
            </span>
          </div>
        </div>

        {/* Precipitation */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Precipitation</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="19" x2="8" y2="21" />
              <line x1="8" y1="13" x2="8" y2="15" />
              <line x1="16" y1="19" x2="16" y2="21" />
              <line x1="16" y1="13" x2="16" y2="15" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="12" y1="15" x2="12" y2="17" />
              <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
            </svg>
          </div>
          <div className="metric-body">
            <span className="metric-value">{weather.precipitationMm}</span>
            <span className="metric-unit">mm</span>
            <span className="metric-hint">
              {weather.precipitationMm === 0 ? 'No rain in past hour' : 'Observed in past hour'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

