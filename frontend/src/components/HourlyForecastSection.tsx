import { useState } from 'react';
import HourlyForecastChart from './HourlyForecastChart';
import WeatherIcon from './WeatherIcon';
import type { HourlyForecast } from '../types/weather';
import type { WeatherTheme } from '../utils/weather-theme';

interface HourlyForecastSectionProps {
  hourly: HourlyForecast[];
  timezone?: string;
  loading?: boolean;
  theme?: WeatherTheme;
}

export default function HourlyForecastSection({
  hourly,
  timezone,
  loading = false,
  theme,
}: HourlyForecastSectionProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'strip'>('chart');

  const formatHourTime = (isoString: string, index: number) => {
    if (index === 0) return 'Now';

    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: true,
        timeZone: timezone && timezone !== 'UTC' ? timezone : undefined,
      }).format(date);
    } catch {
      return isoString.split('T')[1]?.slice(0, 5) || isoString;
    }
  };

  if (loading) {
    return (
      <section className="forecast-section">
        <div className="forecast-section-header">
          <h3 className="section-title">24-Hour Forecast</h3>
        </div>
        <div className="forecast-loading">Loading hourly forecast...</div>
      </section>
    );
  }

  if (!hourly || hourly.length === 0) {
    return null;
  }

  return (
    <section className="forecast-section">
      <div className="forecast-section-header">
        <h3 className="section-title">24-Hour Forecast</h3>

        <div className="forecast-view-tabs" role="tablist" aria-label="Hourly forecast view">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'chart'}
            className={`tab-btn ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => setViewMode('chart')}
          >
            Chart
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'strip'}
            className={`tab-btn ${viewMode === 'strip' ? 'active' : ''}`}
            onClick={() => setViewMode('strip')}
          >
            Hour Cards
          </button>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <HourlyForecastChart
          hourly={hourly}
          timezone={timezone}
          theme={theme}
        />
      ) : (
        <div className="hourly-scroll-container">
          {hourly.map((item, index) => {
            const hasRain =
              item.precipitationProbabilityPercent != null &&
              item.precipitationProbabilityPercent > 0;

            return (
              <div key={`${item.timestamp}-${index}`} className="hourly-card">
                <span className="hourly-time">{formatHourTime(item.timestamp, index)}</span>

                <WeatherIcon
                  conditionCode={item.conditionCode}
                  isDay={item.isDay}
                  size={34}
                  className="hourly-icon"
                  description={item.description}
                />

                <span className="hourly-temp">{Math.round(item.temperatureCelsius)}°</span>

                {hasRain ? (
                  <span className="hourly-rain-prob">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#38bdf8">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                    </svg>
                    {item.precipitationProbabilityPercent}%
                  </span>
                ) : (
                  <span className="hourly-rain-placeholder">-</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
