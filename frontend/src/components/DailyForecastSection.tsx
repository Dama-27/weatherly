import WeatherIcon from './WeatherIcon';
import type { DailyForecast } from '../types/weather';

interface DailyForecastSectionProps {
  daily: DailyForecast[];
  loading?: boolean;
}

function getUvBadgeClass(uv: number): string {
  if (uv <= 2) return 'uv-low';
  if (uv <= 5) return 'uv-moderate';
  if (uv <= 7) return 'uv-high';
  if (uv <= 10) return 'uv-very-high';
  return 'uv-extreme';
}

export default function DailyForecastSection({
  daily,
  loading = false,
}: DailyForecastSectionProps) {
  const formatDayName = (dateStr: string, index: number) => {
    if (index === 0) return 'Today';
    try {
      const date = new Date(`${dateStr}T12:00:00Z`);
      return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    } catch {
      return dateStr;
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(`${dateStr}T12:00:00Z`);
      return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(date);
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <section className="forecast-section">
        <h3 className="section-title">7-Day Forecast</h3>
        <div className="forecast-loading">Loading daily forecast...</div>
      </section>
    );
  }

  if (!daily || daily.length === 0) {
    return null;
  }

  // Calculate global min and max across all 7 days for a consistent visual temperature scale
  const allMins = daily.map((d) => d.minTemperatureCelsius);
  const allMaxs = daily.map((d) => d.maxTemperatureCelsius);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const rangeSpan = Math.max(1, globalMax - globalMin);

  return (
    <section className="forecast-section">
      <h3 className="section-title">7-Day Forecast</h3>

      <div className="daily-list">
        {daily.map((item, index) => {
          const minT = Math.round(item.minTemperatureCelsius);
          const maxT = Math.round(item.maxTemperatureCelsius);

          // Calculate bar percentage offsets for consistent visual scale
          const leftPercent = Math.max(
            0,
            Math.min(100, ((item.minTemperatureCelsius - globalMin) / rangeSpan) * 100)
          );
          const widthPercent = Math.max(
            8,
            Math.min(
              100 - leftPercent,
              ((item.maxTemperatureCelsius - item.minTemperatureCelsius) / rangeSpan) * 100
            )
          );

          const hasRain =
            item.precipitationProbabilityMaxPercent != null &&
            item.precipitationProbabilityMaxPercent > 0;
          const uvVal = item.uvIndexMax != null ? Math.round(item.uvIndexMax) : null;

          return (
            <div key={`${item.date}-${index}`} className="daily-row">
              <div className="daily-day-col">
                <span className="daily-day-name">{formatDayName(item.date, index)}</span>
                <span className="daily-date">{formatDateLabel(item.date)}</span>
              </div>

              <div className="daily-condition-col">
                <WeatherIcon
                  conditionCode={item.conditionCode}
                  isDay={true}
                  size={30}
                  className="daily-icon"
                  description={item.description}
                />
                <span className="daily-desc">{item.description}</span>
              </div>

              <div className="daily-badges-col">
                {hasRain ? (
                  <span className="daily-rain-chance" title={`Precipitation probability: ${item.precipitationProbabilityMaxPercent}%`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#38bdf8">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                    </svg>
                    {item.precipitationProbabilityMaxPercent}%
                  </span>
                ) : (
                  <span className="daily-badge-placeholder" />
                )}

                {uvVal != null && (
                  <span
                    className={`daily-uv-badge ${getUvBadgeClass(uvVal)}`}
                    title={`Maximum UV Index: ${uvVal}`}
                  >
                    UV {uvVal}
                  </span>
                )}
              </div>

              <div className="daily-range-col">
                <span className="temp-low">{minT}°</span>
                <div className="temp-bar-bg" title={`Range: ${minT}°C – ${maxT}°C`}>
                  <div
                    className="temp-bar-fill"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                  />
                </div>
                <span className="temp-high">{maxT}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
