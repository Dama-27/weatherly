import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { searchLocations } from '../services/weather.service';
import type { LocationSearchResult, SavedLocation } from '../types/weather';

interface LocationSearchProps {
  onSelectLocation: (loc: SavedLocation) => void;
  accessToken?: string;
  placeholder?: string;
}

export default function LocationSearch({
  onSelectLocation,
  accessToken,
  placeholder = 'Search city or location...',
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsOpen(false);
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchLocations(trimmed, 7, accessToken);
        setResults(searchResults);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    }, 320);
  };

  const handleSelect = (item: LocationSearchResult) => {
    onSelectLocation({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      region: item.region,
      country: item.country,
      timezone: item.timezone,
    });
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearInput = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  return (
    <div className="location-search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          className="search-input"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          aria-label="Search city or location"
          autoComplete="off"
        />

        {loading && (
          <div className="search-spinner" aria-hidden="true" />
        )}

        {query && !loading && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={clearInput}
            aria-label="Clear search input"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div className="search-dropdown" role="listbox">
          {errorMessage ? (
            <div className="search-message error">{errorMessage}</div>
          ) : results.length === 0 ? (
            <div className="search-message">No matching locations found</div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === activeIndex;
              const locationSubtext = [item.region, item.country].filter(Boolean).join(', ');

              return (
                <button
                  key={`${item.latitude}-${item.longitude}-${idx}`}
                  type="button"
                  className={`search-result-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="result-name">{item.name}</span>
                  {locationSubtext && (
                    <span className="result-subtext">{locationSubtext}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
