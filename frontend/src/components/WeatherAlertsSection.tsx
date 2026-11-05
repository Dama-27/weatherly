import { useId, useState } from 'react';
import type {
  AlertLocation,
  AlertRule,
  AlertType,
  TriggeredAlert,
} from '../types/weather';
import {
  getNotificationStatus,
  requestNotificationPermission,
  type NotificationSupportStatus,
} from '../utils/browser-notifications';

interface WeatherAlertsSectionProps {
  currentLocation: AlertLocation;
  rules: AlertRule[];
  triggeredAlerts: TriggeredAlert[];
  disclaimer?: string;
  isEvaluating?: boolean;
  onCreateRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  onToggleRule: (id: string, enabled: boolean) => void;
  onDeleteRule: (id: string) => void;
}

const ALERT_TYPE_LABELS: Record<
  AlertType,
  { label: string; unit: string; description: string; defaultThreshold: number | null }
> = {
  temp_above: {
    label: 'Temperature Above',
    unit: '°C',
    description: 'Triggers when current or forecast temperature exceeds threshold.',
    defaultThreshold: 32,
  },
  temp_below: {
    label: 'Temperature Below',
    unit: '°C',
    description: 'Triggers when current or forecast temperature drops below threshold.',
    defaultThreshold: 18,
  },
  rain_prob_above: {
    label: 'Rain Probability Above',
    unit: '%',
    description: 'Triggers when forecast precipitation probability exceeds threshold.',
    defaultThreshold: 60,
  },
  uv_index_above: {
    label: 'UV Index Above',
    unit: 'index',
    description: 'Triggers when current or forecast UV radiation exceeds threshold.',
    defaultThreshold: 8,
  },
  wind_speed_above: {
    label: 'Wind Speed Above',
    unit: 'km/h',
    description: 'Triggers when sustained wind or gusts exceed threshold.',
    defaultThreshold: 35,
  },
  thunderstorm: {
    label: 'Thunderstorm Forecast',
    unit: '',
    description: 'Triggers when thunderstorm conditions (WMO 95, 96, 99) are detected or forecast.',
    defaultThreshold: null,
  },
  heavy_precipitation: {
    label: 'Heavy Precipitation',
    unit: 'mm',
    description: 'Triggers when intense rainfall or downpour exceeds threshold (defaults to 5 mm).',
    defaultThreshold: 5,
  },
};

export default function WeatherAlertsSection({
  currentLocation,
  rules,
  triggeredAlerts,
  disclaimer,
  isEvaluating = false,
  onCreateRule,
  onToggleRule,
  onDeleteRule,
}: WeatherAlertsSectionProps) {
  const [selectedType, setSelectedType] = useState<AlertType>('temp_above');
  const [thresholdInput, setThresholdInput] = useState<string>('32');
  const [formError, setFormError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationSupportStatus>(
    getNotificationStatus()
  );

  const formAlertTypeId = useId();
  const formThresholdId = useId();

  const handleTypeChange = (type: AlertType) => {
    setSelectedType(type);
    const def = ALERT_TYPE_LABELS[type].defaultThreshold;
    setThresholdInput(def !== null ? def.toString() : '');
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const config = ALERT_TYPE_LABELS[selectedType];
    let threshold: number | null = null;

    if (config.unit !== '') {
      const parsed = parseFloat(thresholdInput);
      if (Number.isNaN(parsed)) {
        setFormError('Please enter a valid numeric threshold.');
        return;
      }
      if (selectedType === 'rain_prob_above' && (parsed < 0 || parsed > 100)) {
        setFormError('Rain probability threshold must be between 0% and 100%.');
        return;
      }
      if (selectedType === 'uv_index_above' && parsed < 0) {
        setFormError('UV index threshold must be a non-negative number.');
        return;
      }
      if (selectedType === 'wind_speed_above' && parsed < 0) {
        setFormError('Wind speed threshold must be greater than 0.');
        return;
      }
      threshold = parsed;
    }

    onCreateRule({
      type: selectedType,
      threshold,
      enabled: true,
      location: {
        name: currentLocation.name,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
    });

    setShowCreateForm(false);
  };

  const handleRequestNotifications = async () => {
    const updated = await requestNotificationPermission();
    setNotificationStatus(updated);
  };

  return (
    <section className="forecast-section alerts-section">
      <div className="alerts-header-row">
        <div>
          <h3 className="section-title">Personalized Weather Alerts</h3>
          <p className="alerts-subtitle">
            Configure threshold rules for extreme weather, rain, heat, and storms.
          </p>
        </div>

        <div className="alerts-header-actions">
          {notificationStatus === 'default' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRequestNotifications}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Enable Browser Notifications
            </button>
          )}

          {notificationStatus === 'granted' && (
            <span className="notification-status-badge status-granted">
              <span className="status-dot-green" /> Desktop Notifications Active
            </span>
          )}

          {notificationStatus === 'denied' && (
            <span className="notification-status-badge status-denied">
              Notifications Blocked in Browser
            </span>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? 'Cancel' : '+ New Alert'}
          </button>
        </div>
      </div>

      {/* 1. Active Triggered Alerts Banner */}
      {triggeredAlerts.length > 0 && (
        <div className="triggered-alerts-container">
          <div className="triggered-alerts-header">
            <span className="triggered-icon">⚠️</span>
            <span className="triggered-title">Active Weather Alerts ({triggeredAlerts.length})</span>
          </div>
          <div className="triggered-alerts-grid">
            {triggeredAlerts.map((alert) => (
              <div key={alert.id} className={`triggered-alert-card severity-${alert.severity}`}>
                <div className="alert-card-top">
                  <span className="alert-badge-type">{ALERT_TYPE_LABELS[alert.type]?.label || alert.type}</span>
                  <span className={`alert-severity-pill severity-${alert.severity}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <p className="alert-message-text">{alert.message}</p>
                <div className="alert-footer-meta">
                  <span>📍 {alert.locationName}</span>
                  <span>🕒 {alert.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Create Alert Form */}
      {showCreateForm && (
        <form className="alert-create-form" onSubmit={handleCreateSubmit}>
          <h4 className="form-heading">Create Weather Alert Rule</h4>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor={formAlertTypeId}>Alert Type</label>
              <select
                id={formAlertTypeId}
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value as AlertType)}
              >
                {Object.entries(ALERT_TYPE_LABELS).map(([typeKey, meta]) => (
                  <option key={typeKey} value={typeKey}>
                    {meta.label} {meta.unit ? `(${meta.unit})` : ''}
                  </option>
                ))}
              </select>
              <span className="form-hint">{ALERT_TYPE_LABELS[selectedType].description}</span>
            </div>

            {ALERT_TYPE_LABELS[selectedType].unit !== '' && (
              <div className="form-group">
                <label htmlFor={formThresholdId}>
                  Threshold ({ALERT_TYPE_LABELS[selectedType].unit})
                </label>
                <input
                  id={formThresholdId}
                  type="number"
                  step="any"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  placeholder={`e.g. ${ALERT_TYPE_LABELS[selectedType].defaultThreshold ?? 30}`}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Location Association</label>
              <div className="readonly-location-box">
                📍 {currentLocation.name} ({currentLocation.latitude.toFixed(2)}, {currentLocation.longitude.toFixed(2)})
              </div>
              <span className="form-hint">Associated with your currently selected dashboard location.</span>
            </div>
          </div>

          {formError && <p className="error-message alert-form-error">{formError}</p>}

          <div className="form-actions-row">
            <button type="submit" className="btn btn-primary btn-sm">
              Save Alert
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* 3. Configured Rules List */}
      <div className="configured-alerts-block">
        <div className="configured-alerts-header">
          <h4 className="sub-block-title">Configured Alert Rules ({rules.length})</h4>
          {isEvaluating && <span className="evaluating-indicator">Checking conditions...</span>}
        </div>

        {rules.length === 0 ? (
          <div className="alerts-empty-state">
            <p>No weather alerts configured yet.</p>
            <p className="empty-subtext">
              Set alerts to get notified about high heat, sudden rain, thunderstorms, or intense UV levels.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Alert
            </button>
          </div>
        ) : (
          <div className="rules-list-grid">
            {rules.map((rule) => {
              const isTriggered = triggeredAlerts.some((ta) => ta.ruleId === rule.id);
              const meta = ALERT_TYPE_LABELS[rule.type];

              return (
                <div
                  key={rule.id}
                  className={`rule-card ${!rule.enabled ? 'rule-disabled' : ''} ${
                    isTriggered ? 'rule-card-active' : ''
                  }`}
                >
                  <div className="rule-card-header">
                    <div className="rule-title-group">
                      <span className="rule-type-title">{meta?.label || rule.type}</span>
                      {isTriggered && <span className="rule-triggered-badge">Triggered Now</span>}
                    </div>

                    <div className="rule-controls">
                      <label className="switch-toggle" title={rule.enabled ? 'Disable alert' : 'Enable alert'}>
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => onToggleRule(rule.id, e.target.checked)}
                          aria-label={`Toggle alert for ${meta?.label}`}
                        />
                        <span className="slider-round" />
                      </label>

                      <button
                        type="button"
                        className="btn-icon-delete"
                        onClick={() => onDeleteRule(rule.id)}
                        title="Delete alert"
                        aria-label="Delete alert"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="rule-details-row">
                    <span className="rule-threshold-pill">
                      {rule.threshold !== null && rule.threshold !== undefined
                        ? `Threshold: ${rule.threshold} ${meta?.unit || ''}`
                        : 'Condition: Forecast / Present'}
                    </span>
                    <span className="rule-location-pill">📍 {rule.location.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MVP Disclaimer */}
      <div className="alerts-disclaimer-box">
        <p className="alerts-disclaimer-text">
          {disclaimer ||
            'MVP Notice: Alerts are evaluated when Weatherly is open and refreshing weather data. They are not guaranteed real-time emergency warnings.'}
        </p>
      </div>
    </section>
  );
}

