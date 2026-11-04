/**
 * Canonical unit conversion utilities.
 *
 * Canonical weather units across Weatherly:
 * - Temperature: Celsius (°C)
 * - Wind Speed: km/h
 * - Atmospheric Pressure: hPa
 * - Precipitation: mm
 * - Relative Humidity: percentage (%)
 * - Wind Direction: degrees (0-360°)
 */

/**
 * Rounds a number to a fixed number of decimal places.
 */
export function roundTo(value: number, decimals: number = 2): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return value;
  }
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Converts temperature from Kelvin to Celsius.
 * 0 K = -273.15 °C
 */
export function kelvinToCelsius(kelvin: number, decimals: number = 2): number {
  return roundTo(kelvin - 273.15, decimals);
}

/**
 * Converts temperature from Celsius to Kelvin.
 * 0 °C = 273.15 K
 */
export function celsiusToKelvin(celsius: number, decimals: number = 2): number {
  return roundTo(celsius + 273.15, decimals);
}

/**
 * Converts wind speed from meters per second (m/s) to kilometers per hour (km/h).
 * 1 m/s = 3.6 km/h
 */
export function mpsToKmh(mps: number, decimals: number = 2): number {
  return roundTo(mps * 3.6, decimals);
}

/**
 * Converts wind speed from kilometers per hour (km/h) to meters per second (m/s).
 * 1 km/h = 1 / 3.6 m/s
 */
export function kmhToMps(kmh: number, decimals: number = 2): number {
  return roundTo(kmh / 3.6, decimals);
}

