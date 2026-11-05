import { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import AuthButtons from './components/AuthButtons';
import CurrentWeatherSection from './components/CurrentWeatherSection';
import DailyForecastSection from './components/DailyForecastSection';
import HourlyForecastSection from './components/HourlyForecastSection';
import Loading from './components/Loading';
import UserHeader from './components/UserHeader';
import WeatherCard from './components/WeatherCard';
import WeatherMetricsGrid from './components/WeatherMetricsGrid';
import WeatherRecommendationsSection from './components/WeatherRecommendationsSection';
import WeatherAlertsSection from './components/WeatherAlertsSection';
import WeatherCopilotSection from './components/WeatherCopilotSection';
import WeatherTable from './components/WeatherTable';
import {
  evaluateWeatherAlerts,
  getCurrentWeather,
  getDailyForecast,
  getHourlyForecast,
  getWeatherData,
  getWeatherRecommendations,
} from './services/weather.service';
import {
  createAlertRule,
  deleteAlertRule,
  getStoredAlerts,
  toggleAlertRule,
} from './utils/alert-storage';
import { notifyTriggeredAlert } from './utils/browser-notifications';
import { getWeatherTheme } from './utils/weather-theme';
import type {
  AlertRule,
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  SavedLocation,
  TriggeredAlert,
  WeatherRecommendationsReport,
  WeatherResult,
} from './types/weather';

const STORAGE_LOCATION_KEY = 'weatherly_saved_location';

const DEFAULT_LOCATION: SavedLocation = {
  name: 'Colombo',
  latitude: 6.9271,
  longitude: 79.8612,
  country: 'Sri Lanka',
  timezone: 'Asia/Colombo',
};

function getInitialLocation(): SavedLocation {
  try {
    const raw = localStorage.getItem(STORAGE_LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number' &&
        typeof parsed.name === 'string'
      ) {
        return parsed;
      }
    }
  } catch {
    // Ignore invalid JSON
  }
  return DEFAULT_LOCATION;
}

export default function App() {
  const { isAuthenticated, isLoading, error: authError, user, getAccessTokenSilently } = useAuth0();

  // Navigation state
  const [activeView, setActiveView] = useState<'personal' | 'rankings'>('personal');

  // Personal weather state
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation>(getInitialLocation);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);
  const [recommendations, setRecommendations] = useState<WeatherRecommendationsReport | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Weather alerts state (scoped to user.sub)
  const [alerts, setAlerts] = useState<AlertRule[]>(() => getStoredAlerts(user?.sub));
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [alertsDisclaimer, setAlertsDisclaimer] = useState<string | undefined>();
  const [alertsEvaluating, setAlertsEvaluating] = useState(false);

  // Sync stored alerts when user ID changes (e.g. login/logout)
  const [prevUserSub, setPrevUserSub] = useState(user?.sub);
  if (user?.sub !== prevUserSub) {
    setPrevUserSub(user?.sub);
    setAlerts(getStoredAlerts(user?.sub));
  }

  // Alert management handlers
  const handleCreateAlert = (ruleData: Omit<AlertRule, 'id' | 'createdAt'>) => {
    createAlertRule(ruleData, user?.sub);
    setAlerts(getStoredAlerts(user?.sub));
  };

  const handleToggleAlert = (id: string, enabled: boolean) => {
    toggleAlertRule(id, enabled, user?.sub);
    setAlerts(getStoredAlerts(user?.sub));
  };

  const handleDeleteAlert = (id: string) => {
    deleteAlertRule(id, user?.sub);
    setAlerts(getStoredAlerts(user?.sub));
  };

  // Geolocation state
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{ message: string; isError: boolean } | null>(null);

  // Legacy 10-city Comfort Index dashboard state
  const [rankings, setRankings] = useState<WeatherResult[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rank' | 'comfortScore' | 'temperature' | 'city'>('rank');

  // Load weather when selectedLocation changes (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isMounted = true;

    async function fetchWeather() {
      setWeatherLoading(true);
      setWeatherError(null);

      try {
        let token: string | undefined;
        try {
          token = await getAccessTokenSilently();
        } catch {
          // Token unavailable
        }

        const [currentRes, hourlyRes, dailyRes, recsRes] = await Promise.all([
          getCurrentWeather(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name, token),
          getHourlyForecast(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name, token),
          getDailyForecast(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name, token),
          getWeatherRecommendations(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name, token).catch((err) => {
            console.warn('Weather recommendations failed to load:', err);
            return null;
          }),
        ]);

        if (isMounted) {
          setCurrentWeather(currentRes.current);
          setHourlyForecast(hourlyRes.hourly || []);
          setDailyForecast(dailyRes.daily || []);
          setRecommendations(recsRes);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setWeatherError(err instanceof Error ? err.message : 'Unable to load weather forecast');
        }
      } finally {
        if (isMounted) {
          setWeatherLoading(false);
        }
      }
    }

    fetchWeather();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, selectedLocation, reloadTrigger, getAccessTokenSilently]);

  // Evaluate weather alerts against current & forecast conditions
  useEffect(() => {
    if (!isAuthenticated || alerts.length === 0) {
      return;
    }

    let isMounted = true;

    async function evaluateAlerts() {
      try {
        setAlertsEvaluating(true);
        let token: string | undefined;
        try {
          token = await getAccessTokenSilently();
        } catch {
          // Token unavailable
        }

        const report = await evaluateWeatherAlerts(
          alerts,
          {
            name: selectedLocation.name,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          },
          token
        );

        if (isMounted) {
          setTriggeredAlerts(report.alerts || []);
          setAlertsDisclaimer(report.disclaimer);

          // Dispatch native desktop notifications for triggered alerts
          for (const alert of report.alerts || []) {
            notifyTriggeredAlert(alert);
          }
        }
      } catch (err) {
        console.warn('Weather alerts evaluation failed:', err);
      } finally {
        if (isMounted) {
          setAlertsEvaluating(false);
        }
      }
    }

    evaluateAlerts();

    return () => {
      isMounted = false;
    };
  }, [alerts, selectedLocation, currentWeather, isAuthenticated, getAccessTokenSilently]);

  // Load 10-city comfort ranking data when rankings view is activated
  useEffect(() => {
    if (!isAuthenticated || activeView !== 'rankings') {
      return;
    }

    let isMounted = true;

    async function loadRankings() {
      try {
        setRankingsLoading(true);
        setRankingsError(null);
        const token = await getAccessTokenSilently();
        const data = await getWeatherData(token);
        if (isMounted) {
          setRankings(data);
        }
      } catch {
        if (isMounted) {
          setRankingsError('Unable to load city comfort rankings.');
        }
      } finally {
        if (isMounted) {
          setRankingsLoading(false);
        }
      }
    }

    loadRankings();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, activeView, getAccessTokenSilently]);

  // Select location handler
  const handleSelectLocation = (loc: SavedLocation) => {
    setSelectedLocation(loc);
    setLocationNotice(null);
    try {
      localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(loc));
    } catch {
      // Ignore storage errors
    }
  };

  // Browser Geolocation request handler
  const handleRequestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice({
        message: 'Geolocation is not supported by your browser.',
        isError: true,
      });
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const newLocation: SavedLocation = {
          name: 'Current Location',
          latitude: Math.round(latitude * 10000) / 10000,
          longitude: Math.round(longitude * 10000) / 10000,
        };
        handleSelectLocation(newLocation);
        setLocationNotice({
          message: 'Location updated using your device GPS.',
          isError: false,
        });
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission was denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is currently unavailable.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Please try searching for your city instead.';
            break;
        }
        setLocationNotice({ message: msg, isError: true });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Sorted rankings for the preserved 10-city dashboard
  const sortedRankings = useMemo(() => {
    const data = [...rankings];
    switch (sortBy) {
      case 'comfortScore':
        return data.sort((a, b) => (b.comfortScore ?? -Infinity) - (a.comfortScore ?? -Infinity));
      case 'temperature':
        return data.sort((a, b) => (b.temperature ?? -Infinity) - (a.temperature ?? -Infinity));
      case 'city':
        return data.sort((a, b) => (a.city || '').localeCompare(b.city || ''));
      case 'rank':
      default:
        return data.sort((a, b) => a.rank - b.rank);
    }
  }, [rankings, sortBy]);

  // Centralized dynamic weather theme
  const weatherTheme = useMemo(() => {
    if (!currentWeather) return undefined;
    return getWeatherTheme(currentWeather.conditionCode, currentWeather.isDay);
  }, [currentWeather]);

  const appShellStyle = useMemo(() => {
    if (!weatherTheme) return undefined;
    return {
      '--dynamic-theme-accent': weatherTheme.accentColor,
      '--dynamic-theme-border': weatherTheme.cardBorder,
      '--dynamic-theme-bg-tint': weatherTheme.bgTint,
    } as React.CSSProperties;
  }, [weatherTheme]);

  // Auth0 Loading screen
  if (isLoading) {
    return (
      <main className="login-container">
        <h1>Weatherly</h1>
        <Loading />
      </main>
    );
  }

  // Auth0 Unauthenticated screen
  if (!isAuthenticated) {
    return (
      <main className="login-container">
        <div className="login-brand">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
          <h1>Weatherly</h1>
        </div>
        {!authError && <p>Please log in to access your personal weather dashboard.</p>}
        <div className="login-card">
          <AuthButtons />
        </div>
      </main>
    );
  }

  return (
    <div
      className={`app-shell ${weatherTheme ? `theme-${weatherTheme.id}` : ''}`}
      style={appShellStyle}
    >
      <UserHeader
        onSelectLocation={handleSelectLocation}
        onRequestCurrentLocation={handleRequestCurrentLocation}
        isLocating={isLocating}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="main-content">
        {/* Geolocation notice / alert */}
        {locationNotice && (
          <div className={`notice-banner ${locationNotice.isError ? 'notice-error' : 'notice-success'}`}>
            <span>{locationNotice.message}</span>
            <button
              type="button"
              className="notice-close-btn"
              onClick={() => setLocationNotice(null)}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* View 1: Personal Weather Dashboard */}
        {activeView === 'personal' && (
          <>
            {weatherLoading && !currentWeather ? (
              <div className="dashboard-loading-state">
                <Loading />
                <p>Retrieving real-time weather conditions...</p>
              </div>
            ) : weatherError && !currentWeather ? (
              <div className="dashboard-error-state">
                <p className="error-message">{weatherError}</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setReloadTrigger((n) => n + 1)}
                >
                  Retry
                </button>
              </div>
            ) : currentWeather ? (
              <div className="dashboard-layout">
                {/* Hero Section */}
                <CurrentWeatherSection
                  weather={currentWeather}
                  todayForecast={dailyForecast[0]}
                  theme={weatherTheme}
                />

                {/* Weather Metrics Grid */}
                <WeatherMetricsGrid weather={currentWeather} />

                {/* 24-Hour Hourly Forecast Section (Chart / Cards) */}
                <HourlyForecastSection
                  hourly={hourlyForecast}
                  timezone={currentWeather.location.timezone}
                  loading={weatherLoading}
                  theme={weatherTheme}
                />

                {/* Smart Weather Recommendations Section */}
                <WeatherRecommendationsSection
                  recommendations={recommendations}
                  loading={weatherLoading}
                  error={weatherError}
                  onRetry={() => setReloadTrigger((n) => n + 1)}
                />

                {/* Personalized Weather Alerts & Notifications Section */}
                <WeatherAlertsSection
                  currentLocation={{
                    name: selectedLocation.name,
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  rules={alerts}
                  triggeredAlerts={alerts.length === 0 ? [] : triggeredAlerts}
                  disclaimer={alertsDisclaimer}
                  isEvaluating={alertsEvaluating}
                  onCreateRule={handleCreateAlert}
                  onToggleRule={handleToggleAlert}
                  onDeleteRule={handleDeleteAlert}
                />

                {/* AI Weather Copilot Panel */}
                <WeatherCopilotSection
                  location={selectedLocation}
                  getAccessTokenSilently={getAccessTokenSilently}
                />

                {/* 7-Day Forecast Section */}
                <DailyForecastSection
                  daily={dailyForecast}
                  loading={weatherLoading}
                />
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <p>No weather data found for this location.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSelectLocation(DEFAULT_LOCATION)}
                >
                  Reset to Colombo
                </button>
              </div>
            )}
          </>
        )}

        {/* View 2: Preserved 10-City Comfort Index Rankings */}
        {activeView === 'rankings' && (
          <section className="rankings-view-container">
            <div className="rankings-header-row">
              <div>
                <h2>City Comfort Rankings</h2>
                <p className="section-subtext">
                  Algorithmic Comfort Index score (0–100) evaluating temperature, humidity, wind, and rain.
                </p>
              </div>

              <div className="controls">
                <label htmlFor="sort-select">Sort by:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'rank' | 'comfortScore' | 'temperature' | 'city')
                  }
                >
                  <option value="rank">Rank (Comfortable first)</option>
                  <option value="comfortScore">Comfort Score</option>
                  <option value="temperature">Temperature</option>
                  <option value="city">City Name</option>
                </select>
              </div>
            </div>

            {rankingsLoading ? (
              <div className="dashboard-loading-state">
                <Loading />
                <p>Evaluating city comfort scores...</p>
              </div>
            ) : rankingsError ? (
              <p className="error-message">{rankingsError}</p>
            ) : (
              <>
                <div className="desktop-table">
                  <WeatherTable weather={sortedRankings} />
                </div>

                <div className="mobile-cards">
                  {sortedRankings.map((item, index) => (
                    <WeatherCard
                      key={`${item.city}-${item.rank || index}`}
                      weather={item}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
