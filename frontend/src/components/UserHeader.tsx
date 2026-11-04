import { useAuth0 } from '@auth0/auth0-react';
import LocationSearch from './LocationSearch';
import ThemeToggle from './ThemeToggle';
import type { SavedLocation } from '../types/weather';

interface UserHeaderProps {
  onSelectLocation: (loc: SavedLocation) => void;
  onRequestCurrentLocation: () => void;
  isLocating?: boolean;
  activeView: 'personal' | 'rankings';
  onViewChange: (view: 'personal' | 'rankings') => void;
  accessToken?: string;
}

export default function UserHeader({
  onSelectLocation,
  onRequestCurrentLocation,
  isLocating = false,
  activeView,
  onViewChange,
  accessToken,
}: UserHeaderProps) {
  const { user, logout } = useAuth0();

  return (
    <header className="weatherly-header">
      <div className="header-top-row">
        {/* Brand */}
        <div className="brand-group" onClick={() => onViewChange('personal')} role="button" tabIndex={0}>
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">Weatherly</h1>
            <span className="brand-badge">Live Analytics</span>
          </div>
        </div>

        {/* Search Bar & Geolocation Button */}
        <div className="header-search-area">
          <LocationSearch
            onSelectLocation={(loc) => {
              onSelectLocation(loc);
              if (activeView !== 'personal') {
                onViewChange('personal');
              }
            }}
            accessToken={accessToken}
            placeholder="Search city, region, or country..."
          />

          <button
            type="button"
            className="btn-icon locate-btn"
            onClick={() => {
              onRequestCurrentLocation();
              if (activeView !== 'personal') {
                onViewChange('personal');
              }
            }}
            disabled={isLocating}
            title="Use current GPS location"
            aria-label="Use current location"
          >
            {isLocating ? (
              <span className="search-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="22" y1="12" x2="18" y2="12" />
                <line x1="6" y1="12" x2="2" y2="12" />
                <line x1="12" y1="6" x2="12" y2="2" />
                <line x1="12" y1="22" x2="12" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Actions (View Switcher, Theme, User Profile & Logout) */}
        <div className="header-actions">
          {/* Navigation tabs */}
          <nav className="view-switch-nav" aria-label="View switch">
            <button
              type="button"
              className={`view-tab ${activeView === 'personal' ? 'active' : ''}`}
              onClick={() => onViewChange('personal')}
            >
              Weather
            </button>
            <button
              type="button"
              className={`view-tab ${activeView === 'rankings' ? 'active' : ''}`}
              onClick={() => onViewChange('rankings')}
            >
              City Comfort
            </button>
          </nav>

          <ThemeToggle />

          {/* User profile & Logout */}
          <div className="user-profile-menu">
            <span className="user-display-name" title={user?.name || user?.email}>
              {user?.name || user?.email || 'User'}
            </span>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                logout({
                  logoutParams: {
                    returnTo: window.location.origin,
                  },
                })
              }
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
