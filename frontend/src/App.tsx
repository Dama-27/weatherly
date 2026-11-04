import { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getWeatherData } from './services/weather.service';
import type { WeatherResult } from './types/weather';
import WeatherTable from './components/WeatherTable';
import WeatherCard from './components/WeatherCard';
import Loading from './components/Loading';
import UserHeader from './components/UserHeader';
import AuthButtons from './components/AuthButtons';

function App() {
  const { isAuthenticated, isLoading, error: authError, getAccessTokenSilently } = useAuth0();
  const [weather, setWeather] = useState<WeatherResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rank' | 'comfortScore' | 'temperature' | 'city'>('rank');

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadWeather() {
      try {
        setLoading(true);
        setError(null);

        const accessToken = await getAccessTokenSilently();
        const data = await getWeatherData(accessToken);
        setWeather(data);
      } catch {
        setError('Unable to load weather data.');
      } finally {
        setLoading(false);
      }
    }

    loadWeather();
  }, [isAuthenticated, getAccessTokenSilently]);

  const sortedWeather = useMemo(() => {
    const data = [...weather];

    switch (sortBy) {
      case 'comfortScore':
        return data.sort(
          (a, b) => (b.comfortScore ?? -Infinity) - (a.comfortScore ?? -Infinity)
        );

      case 'temperature':
        return data.sort(
          (a, b) => (b.temperature ?? -Infinity) - (a.temperature ?? -Infinity)
        );

      case 'city':
        return data.sort((a, b) =>
          (a.city || '').localeCompare(b.city || '')
        );

      case 'rank':
      default:
        return data.sort((a, b) => a.rank - b.rank);
    }
  }, [weather, sortBy]);

  if (isLoading) {
    return (
      <main className="login-container">
        <h1>Weatherly</h1>
        <Loading />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="login-container">
        <h1>Weatherly</h1>
        {!authError && <p>Please log in to access the weather comfort dashboard.</p>}
        <div className="login-card">
          <AuthButtons />
        </div>
      </main>
    );
  }

  return (
    <main>
      <UserHeader />

      {loading ? (
        <Loading />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : weather.length === 0 ? (
        <p>No weather data available.</p>
      ) : (
        <>
          <div className="controls">
            <label htmlFor="sort">Sort by:</label>
            <select
              id="sort"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as 'rank' | 'comfortScore' | 'temperature' | 'city')
              }
            >
              <option value="rank">Rank</option>
              <option value="comfortScore">Comfort Score</option>
              <option value="temperature">Temperature</option>
              <option value="city">City Name</option>
            </select>
          </div>

          <div className="desktop-table">
            <WeatherTable weather={sortedWeather} />
          </div>

          <div className="mobile-cards">
            {sortedWeather.map((item, index) => (
              <WeatherCard
                key={`${item.city}-${item.rank || index}`}
                weather={item}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default App;