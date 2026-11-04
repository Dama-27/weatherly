interface WeatherIconProps {
  conditionCode?: number | string;
  isDay?: boolean;
  size?: number;
  className?: string;
  description?: string;
}

export default function WeatherIcon({
  conditionCode,
  isDay = true,
  size = 48,
  className = '',
  description = 'Weather icon',
}: WeatherIconProps) {
  const code = Number(conditionCode);

  // Clear sky
  if (code === 0) {
    if (isDay) {
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
          <circle cx="24" cy="24" r="10" fill="url(#sun-grad)" />
          <g stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
            <line x1="24" y1="4" x2="24" y2="8" />
            <line x1="24" y1="40" x2="24" y2="44" />
            <line x1="4" y1="24" x2="8" y2="24" />
            <line x1="40" y1="24" x2="44" y2="24" />
            <line x1="9.86" y1="9.86" x2="12.69" y2="12.69" />
            <line x1="35.31" y1="35.31" x2="38.14" y2="38.14" />
            <line x1="9.86" y1="38.14" x2="12.69" y2="35.31" />
            <line x1="35.31" y1="12.69" x2="38.14" y2="9.86" />
          </g>
          <defs>
            <linearGradient id="sun-grad" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fde047" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      );
    }
    // Night clear
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
        <path
          d="M32.5 28.5C32.5 35.127 27.127 40.5 20.5 40.5C16.892 40.5 13.684 38.904 11.5 36.383C12.875 36.786 14.331 37 15.833 37C24.394 37 31.333 30.061 31.333 21.5C31.333 16.486 28.953 12.029 25.26 9.206C30.222 10.925 32.5 16.273 32.5 21.5V28.5Z"
          fill="url(#moon-grad)"
        />
        <circle cx="36" cy="14" r="1.5" fill="#fef08a" />
        <circle cx="16" cy="12" r="1" fill="#fef08a" />
        <defs>
          <linearGradient id="moon-grad" x1="15" y1="10" x2="35" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fef08a" />
            <stop offset="1" stopColor="#facc15" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Mainly clear or partly cloudy
  if (code === 1 || code === 2) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
        <circle cx="18" cy="18" r="8" fill="url(#sun-small-grad)" />
        <path
          d="M38 34C38 30.686 35.314 28 32 28C31.656 28 31.32 28.029 30.994 28.085C29.742 24.512 26.177 22 22 22C17.029 22 13 26.029 13 31C13 31.378 13.023 31.751 13.069 32.117C10.748 32.593 9 34.629 9 37C9 39.761 11.239 42 14 42H33C35.761 42 38 39.761 38 37V34Z"
          fill="url(#cloud-grad)"
        />
        <defs>
          <linearGradient id="sun-small-grad" x1="10" y1="10" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fde047" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="cloud-grad" x1="9" y1="22" x2="38" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Overcast (3)
  if (code === 3) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
        <path
          d="M38 28C38 24.686 35.314 22 32 22C31.656 22 31.32 22.029 30.994 22.085C29.742 18.512 26.177 16 22 16C17.029 16 13 20.029 13 25C13 25.378 13.023 25.751 13.069 26.117C10.748 26.593 9 28.629 9 31C9 33.761 11.239 36 14 36H33C35.761 36 38 33.761 38 31V28Z"
          fill="url(#overcast-grad)"
        />
        <defs>
          <linearGradient id="overcast-grad" x1="9" y1="16" x2="38" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Fog (45, 48)
  if (code === 45 || code === 48) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
        <path
          d="M35 22C35 19.239 32.761 17 30 17C29.71 17 29.426 17.025 29.15 17.072C28.09 14.108 25.105 12 21.6 12C17.403 12 14 15.403 14 19.6C14 19.92 14.02 20.235 14.059 20.544C12.096 20.946 10.6 22.668 10.6 24.67C10.6 27 12.5 28.9 14.83 28.9H32.4C34.73 28.9 36.63 27 36.63 24.67V22H35Z"
          fill="#cbd5e1"
        />
        <line x1="10" y1="33" x2="38" y2="33" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="14" y1="38" x2="34" y2="38" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Drizzle / Rain (51-67, 80-82)
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
        <path
          d="M37 24C37 20.686 34.314 18 31 18C30.656 18 30.32 18.029 29.994 18.085C28.742 14.512 25.177 12 21 12C16.029 12 12 16.029 12 21C12 21.378 12.023 21.751 12.069 22.117C9.748 22.593 8 24.629 8 27C8 29.761 10.239 32 13 32H32C34.761 32 37 29.761 37 27V24Z"
          fill="url(#cloud-rain-grad)"
        />
        <line x1="16" y1="36" x2="14" y2="42" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="36" x2="22" y2="42" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="36" x2="30" y2="42" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="cloud-rain-grad" x1="8" y1="12" x2="37" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#64748b" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Snow (71-77, 85-86)
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
        <path
          d="M37 24C37 20.686 34.314 18 31 18C30.656 18 30.32 18.029 29.994 18.085C28.742 14.512 25.177 12 21 12C16.029 12 12 16.029 12 21C12 21.378 12.023 21.751 12.069 22.117C9.748 22.593 8 24.629 8 27C8 29.761 10.239 32 13 32H32C34.761 32 37 29.761 37 27V24Z"
          fill="url(#cloud-snow-grad)"
        />
        <circle cx="16" cy="38" r="2" fill="#93c5fd" />
        <circle cx="24" cy="40" r="2" fill="#93c5fd" />
        <circle cx="32" cy="38" r="2" fill="#93c5fd" />
        <defs>
          <linearGradient id="cloud-snow-grad" x1="8" y1="12" x2="37" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f1f5f9" />
            <stop offset="1" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Thunderstorms (95, 96, 99)
  if (code >= 95 && code <= 99) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
        <path
          d="M37 22C37 18.686 34.314 16 31 16C30.656 16 30.32 16.029 29.994 16.085C28.742 12.512 25.177 10 21 10C16.029 10 12 14.029 12 19C12 19.378 12.023 19.751 12.069 20.117C9.748 20.593 8 22.629 8 25C8 27.761 10.239 30 13 30H32C34.761 30 37 27.761 37 25V22Z"
          fill="url(#cloud-thunder-grad)"
        />
        <polygon points="23,28 17,38 23,38 21,46 29,34 23,34" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
        <defs>
          <linearGradient id="cloud-thunder-grad" x1="8" y1="10" x2="37" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#475569" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Default fallback icon
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label={description}>
      <circle cx="24" cy="24" r="12" fill="#cbd5e1" />
    </svg>
  );
}

