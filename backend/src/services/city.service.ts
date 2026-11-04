import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CitiesPayload, City } from '../types/city.types.js';
import type { GeoCoordinates } from '../types/weather-domain.types.js';

// Fallback coordinate map for known default cities
const DEFAULT_CITY_COORDINATES: Record<string, GeoCoordinates> = {
  '1248991': { latitude: 6.9271, longitude: 79.8612 }, // Colombo
  '1850147': { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
  '2644210': { latitude: 53.4084, longitude: -2.9916 }, // Liverpool
  '2988507': { latitude: 48.8566, longitude: 2.3522 }, // Paris
  '2147714': { latitude: -33.8688, longitude: 151.2093 }, // Sydney
  '4930956': { latitude: 42.3601, longitude: -71.0589 }, // Boston
  '1796236': { latitude: 31.2304, longitude: 121.4737 }, // Shanghai
  '3143244': { latitude: 59.9139, longitude: 10.7522 }, // Oslo
  '1275339': { latitude: 19.0760, longitude: 72.8777 }, // Mumbai
  '1880252': { latitude: 1.3521, longitude: 103.8198 }, // Singapore
};

function getCitiesFilePath(): string {
  const dirPath = path.resolve(__dirname, '../../../data/cities.json');
  if (existsSync(dirPath)) {
    return dirPath;
  }
  const cwdRootPath = path.resolve(process.cwd(), 'data/cities.json');
  if (existsSync(cwdRootPath)) {
    return cwdRootPath;
  }
  return path.resolve(process.cwd(), '../data/cities.json');
}

export async function getCities(): Promise<City[]> {
  const fileContent = await fs.readFile(getCitiesFilePath(), 'utf-8');
  const payload = JSON.parse(fileContent) as CitiesPayload;
  return payload.List.slice(0, 10);
}

export async function getCityCodes(): Promise<string[]> {
  const cities = await getCities();
  return cities.map((city) => String(city.CityCode));
}

export async function getCityByCode(cityCode: string): Promise<City | undefined> {
  const cities = await getCities();
  return cities.find((city) => String(city.CityCode) === String(cityCode));
}

export async function getCityCoordinates(cityCode: string): Promise<{ coordinates: GeoCoordinates; cityName: string }> {
  const city = await getCityByCode(cityCode);
  const cityName = city?.CityName || 'Unknown';

  if (city?.lat != null && city?.lon != null) {
    return {
      coordinates: { latitude: city.lat, longitude: city.lon },
      cityName,
    };
  }

  const fallback = DEFAULT_CITY_COORDINATES[cityCode];
  if (fallback) {
    return { coordinates: fallback, cityName };
  }

  throw new Error(`Coordinates not found for city code ${cityCode}`);
}
