import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlyForecast } from '../types/weather';
import type { WeatherTheme } from '../utils/weather-theme';

interface HourlyForecastChartProps {
  hourly: HourlyForecast[];
  timezone?: string;
  theme?: WeatherTheme;
}

interface ChartDataPoint {
  rawTimestamp: string;
  timeLabel: string;
  fullTimeLabel: string;
  temp: number;
  feelsLike: number;
  rainProb: number;
  rainMm: number;
  description: string;
  conditionCode: number | string;
  isNow: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
    value?: number;
    name?: string;
    dataKey?: string;
  }>;
}

function CustomChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-header">
        <span className="tooltip-time">{data.fullTimeLabel}</span>
        {data.isNow && <span className="tooltip-now-pill">Current</span>}
      </div>
      <p className="tooltip-desc">{data.description}</p>
      <div className="tooltip-grid">
        <div className="tooltip-item">
          <span className="tooltip-label">Temp:</span>
          <span className="tooltip-val temp-val">{data.temp}°C</span>
        </div>
        <div className="tooltip-item">
          <span className="tooltip-label">Feels like:</span>
          <span className="tooltip-val">{data.feelsLike}°C</span>
        </div>
        <div className="tooltip-item">
          <span className="tooltip-label">Rain chance:</span>
          <span className="tooltip-val rain-val">{data.rainProb}%</span>
        </div>
        {data.rainMm > 0 && (
          <div className="tooltip-item">
            <span className="tooltip-label">Precipitation:</span>
            <span className="tooltip-val">{data.rainMm} mm</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HourlyForecastChart({
  hourly,
  timezone,
  theme,
}: HourlyForecastChartProps) {
  const [showFeelsLike, setShowFeelsLike] = useState(false);
  const [showAccessibleTable, setShowAccessibleTable] = useState(false);

  // Memoize data points for up to 24 hours
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!hourly || hourly.length === 0) return [];

    return hourly.slice(0, 24).map((item, index) => {
      let timeLabel = `${index}h`;
      let fullTimeLabel = item.timestamp;

      try {
        const date = new Date(item.timestamp);
        if (index === 0) {
          timeLabel = 'Now';
        } else {
          timeLabel = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: true,
            timeZone: timezone && timezone !== 'UTC' ? timezone : undefined,
          }).format(date);
        }

        fullTimeLabel = new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: timezone && timezone !== 'UTC' ? timezone : undefined,
        }).format(date);
      } catch {
        timeLabel = item.timestamp.split('T')[1]?.slice(0, 5) || `${index}:00`;
      }

      return {
        rawTimestamp: item.timestamp,
        timeLabel,
        fullTimeLabel,
        temp: Math.round(item.temperatureCelsius ?? 0),
        feelsLike: Math.round(item.feelsLikeCelsius ?? item.temperatureCelsius ?? 0),
        rainProb: Math.round(item.precipitationProbabilityPercent ?? 0),
        rainMm: item.precipitationMm ?? 0,
        description: item.description || 'Clear',
        conditionCode: item.conditionCode,
        isNow: index === 0,
      };
    });
  }, [hourly, timezone]);

  // Compute temperature bounds for nice axis padding
  const { minTemp, maxTemp } = useMemo(() => {
    if (!chartData.length) return { minTemp: 0, maxTemp: 35 };
    const temps = chartData.flatMap((d) =>
      showFeelsLike ? [d.temp, d.feelsLike] : [d.temp]
    );
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    return {
      minTemp: Math.floor(min - 2),
      maxTemp: Math.ceil(max + 2),
    };
  }, [chartData, showFeelsLike]);

  if (!chartData.length) {
    return (
      <div className="chart-empty-state">
        <p>No hourly data available.</p>
      </div>
    );
  }

  const tempStroke = theme?.chartTempColor || '#f59e0b';
  const feelsLikeStroke = theme?.chartFeelsLikeColor || '#fbbf24';
  const rainBarFill = theme?.chartRainColor || '#38bdf8';

  return (
    <div className="hourly-chart-container">
      {/* Chart Toolbar Controls */}
      <div className="chart-toolbar">
        <div className="chart-legend-custom">
          <span className="legend-chip">
            <span className="legend-color-dot" style={{ backgroundColor: tempStroke }} />
            Temperature (°C)
          </span>
          {showFeelsLike && (
            <span className="legend-chip">
              <span className="legend-color-line" style={{ borderColor: feelsLikeStroke }} />
              Feels Like (°C)
            </span>
          )}
          <span className="legend-chip">
            <span className="legend-color-bar" style={{ backgroundColor: rainBarFill }} />
            Precipitation Chance (%)
          </span>
        </div>

        <div className="chart-toolbar-actions">
          <button
            type="button"
            className={`btn-chart-toggle ${showFeelsLike ? 'active' : ''}`}
            onClick={() => setShowFeelsLike((prev) => !prev)}
            aria-pressed={showFeelsLike}
          >
            {showFeelsLike ? '✓ Feels Like Active' : '+ Show Feels Like'}
          </button>

          <button
            type="button"
            className="btn-chart-accessible"
            onClick={() => setShowAccessibleTable((prev) => !prev)}
            aria-expanded={showAccessibleTable}
            aria-controls="hourly-accessible-table"
          >
            {showAccessibleTable ? 'Hide Table View' : 'Table View'}
          </button>
        </div>
      </div>

      {/* Accessible Table View (Toggleable & Screen Reader Friendly) */}
      {showAccessibleTable ? (
        <div id="hourly-accessible-table" className="chart-table-fallback">
          <table className="accessible-weather-table">
            <caption className="sr-only">24-Hour Weather Forecast</caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Condition</th>
                <th scope="col">Temperature</th>
                <th scope="col">Feels Like</th>
                <th scope="col">Rain Probability</th>
                <th scope="col">Precipitation</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.rawTimestamp}>
                  <th scope="row">
                    {row.fullTimeLabel} {row.isNow && '(Now)'}
                  </th>
                  <td>{row.description}</td>
                  <td>{row.temp}°C</td>
                  <td>{row.feelsLike}°C</td>
                  <td>{row.rainProb}%</td>
                  <td>{row.rainMm > 0 ? `${row.rainMm} mm` : '0 mm'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Interactive Recharts Canvas */
        <div className="chart-wrapper" role="region" aria-label="Hourly temperature and precipitation chart">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={chartData}
              margin={{ top: 16, right: 16, left: -10, bottom: 4 }}
            >
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tempStroke} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={tempStroke} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

              <XAxis
                dataKey="timeLabel"
                stroke="var(--text-tertiary)"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
              />

              {/* Left Y-Axis: Temperature (°C) */}
              <YAxis
                yAxisId="temp"
                orientation="left"
                domain={[minTemp, maxTemp]}
                stroke="var(--text-tertiary)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit="°"
                width={38}
              />

              {/* Right Y-Axis: Rain Probability (%) */}
              <YAxis
                yAxisId="rain"
                orientation="right"
                domain={[0, 100]}
                stroke="var(--text-tertiary)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit="%"
                width={38}
              />

              {/* Current Time Indicator */}
              <ReferenceLine
                x={chartData[0]?.timeLabel}
                stroke={tempStroke}
                strokeDasharray="2 2"
                label={{
                  value: 'Now',
                  position: 'top',
                  fill: tempStroke,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />

              {/* Custom Tooltip */}
              <Tooltip content={<CustomChartTooltip />} />

              {/* Rain Probability Bar (Separate visual representation on right axis) */}
              <Bar
                yAxisId="rain"
                dataKey="rainProb"
                name="Rain Probability"
                fill={rainBarFill}
                opacity={0.35}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />

              {/* Temperature Area (Left axis) */}
              <Area
                yAxisId="temp"
                type="monotone"
                dataKey="temp"
                name="Temperature"
                stroke={tempStroke}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#tempGradient)"
                activeDot={{ r: 5, stroke: tempStroke, strokeWidth: 2, fill: '#ffffff' }}
              />

              {/* Optional Feels-Like Temperature Line (Left axis) */}
              {showFeelsLike && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="feelsLike"
                  name="Feels Like"
                  stroke={feelsLikeStroke}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, stroke: feelsLikeStroke, strokeWidth: 2, fill: '#ffffff' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

