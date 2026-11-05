import type {
  ActivitySuitability,
  WeatherRecommendationsReport,
} from '../types/weather';

interface WeatherRecommendationsSectionProps {
  recommendations: WeatherRecommendationsReport | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function getSuitabilityBadgeClass(suitability: ActivitySuitability): string {
  switch (suitability) {
    case 'excellent':
      return 'suitability-badge badge-excellent';
    case 'good':
      return 'suitability-badge badge-good';
    case 'moderate':
      return 'suitability-badge badge-moderate';
    case 'poor':
      return 'suitability-badge badge-poor';
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'optimal':
      return 'status-badge status-optimal';
    case 'favorable':
      return 'status-badge status-favorable';
    case 'caution':
      return 'status-badge status-caution';
    case 'adverse':
    default:
      return 'status-badge status-adverse';
  }
}

function getActivityIcon(activity: string) {
  switch (activity) {
    case 'Walking':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2" />
          <path d="m9 20 3-6 3 6" />
          <path d="m6 12 3-3 4 2 5-3" />
        </svg>
      );
    case 'Running':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="17" cy="4" r="2" />
          <path d="m15 11 2-3 4 1" />
          <path d="M7 21l3-6 4 2 2-6" />
          <path d="m4 17 4-2" />
        </svg>
      );
    case 'Cycling':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5" />
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="15" cy="5" r="1" />
          <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
        </svg>
      );
    case 'Outdoor sports':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M4.93 4.93l4.24 4.24" />
          <path d="m14.83 9.17 4.24-4.24" />
          <path d="m14.83 14.83 4.24 4.24" />
          <path d="m9.17 14.83-4.24 4.24" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case 'Beach activities':
      return (
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
      );
    case 'Hiking':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
        </svg>
      );
    case 'Gardening':
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22v-7" />
          <path d="M9 9a3 3 0 0 1 6 0c0 3-3 6-3 6s-3-3-3-6Z" />
          <path d="M12 15a6 6 0 0 0 6-6c0-2-2-5-6-7-4 2-6 5-6 7a6 6 0 0 0 6 6Z" />
        </svg>
      );
  }
}

export default function WeatherRecommendationsSection({
  recommendations,
  loading = false,
  error = null,
  onRetry,
}: WeatherRecommendationsSectionProps) {
  if (loading && !recommendations) {
    return (
      <section className="forecast-section recommendations-section">
        <h3 className="section-title">Weather Recommendations</h3>
        <div className="forecast-loading">Analyzing weather conditions and generating recommendations...</div>
      </section>
    );
  }

  if (error && !recommendations) {
    return (
      <section className="forecast-section recommendations-section">
        <h3 className="section-title">Weather Recommendations</h3>
        <div className="recommendations-error-box">
          <p className="error-message">{error}</p>
          {onRetry && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </section>
    );
  }

  if (!recommendations) {
    return null;
  }

  const { activities, clothing, dailyAdvice, bestOutdoorWindow, overallStatus, comfortScore } =
    recommendations;

  return (
    <section className="forecast-section recommendations-section">
      <div className="recommendations-header-row">
        <div>
          <h3 className="section-title">Smart Recommendations</h3>
          <p className="recommendations-subtitle">
            Contextual activity suitability, clothing suggestions, and optimal outdoor windows.
          </p>
        </div>

        <div className="recommendations-status-badge-container">
          <span className={getStatusBadgeClass(overallStatus)}>
            {overallStatus.toUpperCase()} ({comfortScore}/100)
          </span>
        </div>
      </div>

      {/* 1. Best Outdoor Window Highlight Banner */}
      {bestOutdoorWindow && (
        <div className="best-window-card">
          <div className="best-window-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="best-window-content">
            <div className="best-window-title-row">
              <span className="best-window-tag">Best Outdoor Window</span>
              <span className="best-window-time">{bestOutdoorWindow.label}</span>
              <span className="best-window-score">Comfort: {bestOutdoorWindow.comfortScore}/100</span>
            </div>
            <p className="best-window-reason">{bestOutdoorWindow.reason}</p>
          </div>
        </div>
      )}

      {/* 2. Outdoor Activities Grid */}
      <div className="recommendations-sub-block">
        <h4 className="sub-block-title">Outdoor Activities</h4>
        <div className="activities-grid">
          {activities.map((item) => (
            <div key={item.activity} className="activity-card">
              <div className="activity-card-header">
                <div className="activity-name-col">
                  <span className="activity-icon">{getActivityIcon(item.activity)}</span>
                  <span className="activity-name">{item.activity}</span>
                </div>
                <span className={getSuitabilityBadgeClass(item.suitability)}>
                  {item.suitability}
                </span>
              </div>
              <p className="activity-reason">{item.reason}</p>
              {item.bestTimeWindow && (
                <div className="activity-best-time">
                  <span className="best-time-label">Suggested Window:</span> {item.bestTimeWindow}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Clothing Suggestions */}
      {clothing.length > 0 && (
        <div className="recommendations-sub-block">
          <h4 className="sub-block-title">Clothing Suggestions</h4>
          <div className="clothing-cards-grid">
            {clothing.map((c) => (
              <div
                key={c.category}
                className={`clothing-card ${c.isPrimary ? 'clothing-primary' : ''}`}
              >
                <div className="clothing-header">
                  <span className="clothing-title">{c.title}</span>
                  {c.isPrimary && <span className="clothing-primary-tag">Recommended</span>}
                </div>
                <p className="clothing-reason">{c.reason}</p>
                <ul className="clothing-items-list">
                  {c.items.map((item, idx) => (
                    <li key={idx} className="clothing-item-pill">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Daily Weather Advice */}
      {dailyAdvice.length > 0 && (
        <div className="recommendations-sub-block">
          <h4 className="sub-block-title">Daily Weather Advice</h4>
          <div className="daily-advice-box">
            <ul className="advice-list">
              {dailyAdvice.map((tip, idx) => (
                <li key={idx} className="advice-item">
                  <span className="advice-bullet" aria-hidden="true">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

