import type { CurrentWeather, LocationInfo } from '../types/weather-domain.types';
import type {
  OverallWeatherStatus,
  RiskSeverity,
  RiskType,
  WeatherIntelligenceReport,
  WeatherRisk,
} from '../types/weather-intelligence.types';

/**
 * Severity ranking order (higher number = greater severity).
 */
const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  extreme: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

export const ADVISORY_DISCLAIMER =
  'This weather risk assessment is an automated informational analysis calculated from forecasted and measured atmospheric conditions. It does not replace or supersede official warnings issued by governmental meteorological agencies.';

/**
 * Calculates a dedicated Weather Intelligence Comfort Score (0-100).
 *
 * Scoring Formula Weights & Rationale:
 * - Feels-Like Temperature (35%): Primary human thermal perception index.
 * - Ambient Temperature (20%): Actual ambient thermal baseline.
 * - Relative Humidity (20%): Controls evaporative cooling and mugginess.
 * - Wind Speed (15%): Modulates ventilation versus wind chill / turbulence.
 * - Precipitation (10%): Direct wetness / disruption factor.
 *
 * Environmental Penalties:
 * Severe atmospheric hazards (e.g. torrential rain, gale-force winds, or extreme heat stress)
 * apply targeted deductions to prevent severe weather from masquerading as comfortable.
 *
 * Missing Telemetry Handling:
 * If any metric is undefined or null, its weight is excluded and the remaining
 * sub-scores are proportionally re-normalized, preventing missing data from being
 * silently evaluated as zero.
 */
export function calculateIntelligenceComfortScore(
  conditions: Partial<CurrentWeather>
): number {
  let weightedSum = 0;
  let totalActiveWeight = 0;

  // 1. Feels-Like Temperature (35%)
  if (conditions.feelsLikeCelsius != null && Number.isFinite(conditions.feelsLikeCelsius)) {
    const val = conditions.feelsLikeCelsius;
    let score = 0;
    if (val >= 21 && val <= 26) score = 100;
    else if ((val >= 18 && val < 21) || (val > 26 && val <= 29)) score = 85;
    else if ((val >= 15 && val < 18) || (val > 29 && val <= 32)) score = 65;
    else if ((val >= 10 && val < 15) || (val > 32 && val <= 35)) score = 40;
    else if ((val >= 5 && val < 10) || (val > 35 && val <= 38)) score = 15;
    else score = 0;

    weightedSum += score * 0.35;
    totalActiveWeight += 0.35;
  }

  // 2. Ambient Temperature (20%)
  if (conditions.temperatureCelsius != null && Number.isFinite(conditions.temperatureCelsius)) {
    const val = conditions.temperatureCelsius;
    let score = 0;
    if (val >= 20 && val <= 25) score = 100;
    else if ((val >= 17 && val < 20) || (val > 25 && val <= 28)) score = 85;
    else if ((val >= 14 && val < 17) || (val > 28 && val <= 31)) score = 65;
    else if ((val >= 10 && val < 14) || (val > 31 && val <= 34)) score = 40;
    else if ((val >= 5 && val < 10) || (val > 34 && val <= 36)) score = 15;
    else score = 0;

    weightedSum += score * 0.2;
    totalActiveWeight += 0.2;
  }

  // 3. Relative Humidity (20%)
  if (conditions.humidityPercent != null && Number.isFinite(conditions.humidityPercent)) {
    const val = conditions.humidityPercent;
    let score = 10;
    if (val >= 40 && val <= 60) score = 100;
    else if ((val >= 30 && val < 40) || (val > 60 && val <= 70)) score = 85;
    else if ((val >= 20 && val < 30) || (val > 70 && val <= 80)) score = 60;
    else if ((val >= 10 && val < 20) || (val > 80 && val <= 90)) score = 25;

    weightedSum += score * 0.2;
    totalActiveWeight += 0.2;
  }

  // 4. Wind Speed (15%)
  if (conditions.windSpeedKmH != null && Number.isFinite(conditions.windSpeedKmH)) {
    const val = conditions.windSpeedKmH;
    let score = 0;
    if (val >= 5 && val <= 15) score = 100;
    else if (val >= 0 && val < 5) score = 75;
    else if (val > 15 && val <= 25) score = 80;
    else if (val > 25 && val <= 35) score = 55;
    else if (val > 35 && val <= 50) score = 20;
    else score = 0;

    weightedSum += score * 0.15;
    totalActiveWeight += 0.15;
  }

  // 5. Precipitation (10%)
  if (conditions.precipitationMm != null && Number.isFinite(conditions.precipitationMm)) {
    const val = conditions.precipitationMm;
    let score = 0;
    if (val <= 0) score = 100;
    else if (val <= 1.0) score = 80;
    else if (val <= 4.0) score = 50;
    else if (val <= 10.0) score = 15;
    else score = 0;

    weightedSum += score * 0.1;
    totalActiveWeight += 0.1;
  }

  // If no weather telemetry is available, return a neutral score of 50
  if (totalActiveWeight === 0) {
    return 50;
  }

  // Base normalized comfort score
  let finalScore = Math.round(weightedSum / totalActiveWeight);

  // Environmental Stress Penalties
  if (conditions.feelsLikeCelsius != null) {
    if (conditions.feelsLikeCelsius >= 42 || conditions.feelsLikeCelsius <= -10) {
      finalScore -= 15; // Severe thermal stress penalty
    } else if (conditions.feelsLikeCelsius >= 38 || conditions.feelsLikeCelsius <= 0) {
      finalScore -= 8;
    }
  }

  if (conditions.precipitationMm != null) {
    if (conditions.precipitationMm >= 20) {
      finalScore -= 20; // Torrential rain penalty
    } else if (conditions.precipitationMm >= 10) {
      finalScore -= 10;
    }
  }

  if (conditions.windSpeedKmH != null && conditions.windSpeedKmH >= 50) {
    finalScore -= 15; // High gale-force wind penalty
  }

  return Math.max(0, Math.min(100, finalScore));
}

/**
 * Assesses atmospheric conditions against established meteorological thresholds
 * to identify active weather risks and suggest sensible precautions.
 */
export function assessWeatherRisks(conditions: Partial<CurrentWeather>): WeatherRisk[] {
  const risks: WeatherRisk[] = [];

  const temp = conditions.temperatureCelsius;
  const feelsLike = conditions.feelsLikeCelsius;
  const rain = conditions.precipitationMm;
  const windSpeed = conditions.windSpeedKmH;
  const windGusts = conditions.windGustsKmH;
  const uv = conditions.uvIndex;
  const conditionCode = typeof conditions.conditionCode === 'number'
    ? conditions.conditionCode
    : Number(conditions.conditionCode);

  // 1. Extreme Heat Assessment
  const effectiveHeat = feelsLike ?? temp;
  if (effectiveHeat != null && Number.isFinite(effectiveHeat) && effectiveHeat >= 30) {
    let severity: RiskSeverity = 'low';
    let headline = 'Warm Weather Awareness';
    let explanation = `Elevated heat levels observed (apparent temperature ${effectiveHeat}°C).`;
    let precaution = 'Stay hydrated and wear breathable, light-colored clothing.';

    if (effectiveHeat >= 42 || (temp != null && temp >= 40)) {
      severity = 'extreme';
      headline = 'Extreme Heat Danger';
      explanation = `Dangerous heat index of ${effectiveHeat}°C. Prolonged exposure carries severe heat stroke risks.`;
      precaution = 'Remain indoors in air-conditioned areas, hydrate frequently, and avoid outdoor physical exertion.';
    } else if (effectiveHeat >= 38 || (temp != null && temp >= 35)) {
      severity = 'high';
      headline = 'High Heat Advisory';
      explanation = `High thermal index of ${effectiveHeat}°C. Heat cramps or heat exhaustion likely with prolonged activity.`;
      precaution = 'Limit direct sun exposure during peak hours, drink ample water, and take regular rest breaks.';
    } else if (effectiveHeat >= 34 || (temp != null && temp >= 32)) {
      severity = 'moderate';
      headline = 'Moderate Heat Advisory';
      explanation = `Apparent temperature of ${effectiveHeat}°C. Warm and humid conditions increase perceived fatigue.`;
      precaution = 'Drink plenty of water and plan intense physical tasks during cooler hours.';
    }

    risks.push({
      type: 'extreme_heat',
      severity,
      headline,
      explanation,
      measuredValue: {
        value: effectiveHeat,
        unit: '°C',
        metric: 'apparent_temperature',
      },
      suggestedPrecaution: precaution,
    });
  }

  // 2. Cold Conditions Assessment
  const effectiveCold = feelsLike ?? temp;
  if (effectiveCold != null && Number.isFinite(effectiveCold) && effectiveCold <= 14) {
    let severity: RiskSeverity = 'low';
    let headline = 'Cool Conditions';
    let explanation = `Brisk temperatures observed (apparent temperature ${effectiveCold}°C).`;
    let precaution = 'A light jacket or sweater is recommended when outdoors.';

    if (effectiveCold <= -15 || (temp != null && temp <= -10)) {
      severity = 'extreme';
      headline = 'Severe Freeze Danger';
      explanation = `Life-threatening wind chill of ${effectiveCold}°C. Frostbite and hypothermia can occur in minutes.`;
      precaution = 'Avoid staying outdoors. Wear heavy insulated layers, windproof shell, and cover all exposed skin.';
    } else if (effectiveCold <= 0 || (temp != null && temp <= 2)) {
      severity = 'high';
      headline = 'Freezing Conditions';
      explanation = `Sub-freezing temperatures (${effectiveCold}°C). Significant risk of ice and cold exposure.`;
      precaution = 'Dress in thermal layers, wear insulated gloves and a winter hat, and watch for icy walkways.';
    } else if (effectiveCold <= 8 || (temp != null && temp <= 10)) {
      severity = 'moderate';
      headline = 'Cold Weather Advisory';
      explanation = `Chilly conditions (${effectiveCold}°C). Continuous exposure causes thermal discomfort.`;
      precaution = 'Wear a warm winter coat, scarf, and warm footwear.';
    }

    risks.push({
      type: 'cold_conditions',
      severity,
      headline,
      explanation,
      measuredValue: {
        value: effectiveCold,
        unit: '°C',
        metric: 'apparent_temperature',
      },
      suggestedPrecaution: precaution,
    });
  }

  // 3. Heavy Rain Assessment
  if (rain != null && Number.isFinite(rain) && rain >= 1.0) {
    let severity: RiskSeverity = 'low';
    let headline = 'Light Showers';
    let explanation = `Light precipitation detected (${rain} mm).`;
    let precaution = 'Keep an umbrella or hooded jacket handy.';

    if (rain >= 25) {
      severity = 'extreme';
      headline = 'Torrential Downpour Danger';
      explanation = `Violent precipitation volume of ${rain} mm. High risk of localized flash flooding and waterlogging.`;
      precaution = 'Avoid driving through flooded roads, move to higher ground if near waterways, and remain indoors.';
    } else if (rain >= 10) {
      severity = 'high';
      headline = 'Heavy Rainfall Warning';
      explanation = `Substantial rainfall of ${rain} mm. Impaired road visibility, ponding, and potential transit delays.`;
      precaution = 'Drive slowly with headlights on, use waterproof gear, and anticipate travel delays.';
    } else if (rain >= 4) {
      severity = 'moderate';
      headline = 'Moderate Rain';
      explanation = `Steady rainfall of ${rain} mm creating wet road conditions.`;
      precaution = 'Carry rain protection and allow extra travel time.';
    }

    risks.push({
      type: 'heavy_rain',
      severity,
      headline,
      explanation,
      measuredValue: {
        value: rain,
        unit: 'mm',
        metric: 'precipitation',
      },
      suggestedPrecaution: precaution,
    });
  }

  // 4. Thunderstorm Assessment
  if (Number.isFinite(conditionCode) && [95, 96, 99].includes(conditionCode)) {
    let severity: RiskSeverity = 'moderate';
    let headline = 'Thunderstorm Activity';
    let explanation = 'Thunderstorm with lightning detected in the area.';
    let precaution = 'Postpone open-air activities. Seek shelter in a sturdy building or enclosed vehicle.';

    if (conditionCode === 99) {
      severity = 'extreme';
      headline = 'Severe Thunderstorm with Heavy Hail';
      explanation = 'Violent convective thunderstorm with heavy hail and intense lightning strikes.';
      precaution = 'Remain indoors away from windows, skylights, and tall metal fixtures until the storm passes.';
    } else if (conditionCode === 96) {
      severity = 'high';
      headline = 'Thunderstorm with Hail';
      explanation = 'Severe thunderstorm with hail and dangerous cloud-to-ground lightning.';
      precaution = 'Seek indoor shelter immediately and avoid open fields, hilltops, and bodies of water.';
    }

    risks.push({
      type: 'thunderstorm',
      severity,
      headline,
      explanation,
      measuredValue: {
        value: conditionCode,
        unit: 'WMO code',
        metric: 'weather_code',
      },
      suggestedPrecaution: precaution,
    });
  }

  // 5. Strong Winds Assessment
  const effectiveWind = Math.max(windSpeed ?? 0, windGusts ?? 0);
  if (effectiveWind >= 25) {
    let severity: RiskSeverity = 'low';
    let headline = 'Moderate Breeze';
    let explanation = `Noticeable wind conditions with speeds up to ${effectiveWind} km/h.`;
    let precaution = 'Be aware of wind resistance when cycling or carrying large objects.';

    if (effectiveWind >= 75) {
      severity = 'extreme';
      headline = 'Gale / Storm-Force Wind Hazard';
      explanation = `Dangerous storm-force winds of ${effectiveWind} km/h. Risk of structural damage and downed trees.`;
      precaution = 'Remain indoors. Secure outdoor furniture and avoid proximity to tall trees or power lines.';
    } else if (effectiveWind >= 50) {
      severity = 'high';
      headline = 'High Wind Advisory';
      explanation = `Strong winds of ${effectiveWind} km/h. Difficult walking and hazardous driving for high-profile vehicles.`;
      precaution = 'Secure loose outdoor items, exercise caution while driving, and watch for flying debris.';
    } else if (effectiveWind >= 35) {
      severity = 'moderate';
      headline = 'Brisk Wind Advisory';
      explanation = `Fresh breeze with wind speeds reaching ${effectiveWind} km/h.`;
      precaution = 'Hold onto loose articles and exercise caution on bridges or exposed coastal areas.';
    }

    risks.push({
      type: 'strong_winds',
      severity,
      headline,
      explanation,
      measuredValue: {
        value: effectiveWind,
        unit: 'km/h',
        metric: 'wind_speed_or_gust',
      },
      suggestedPrecaution: precaution,
    });
  }

  // 6. High UV Exposure Assessment
  if (uv != null && Number.isFinite(uv) && uv >= 3) {
    let severity: RiskSeverity = 'low';
    let headline = 'Moderate UV Exposure';
    let explanation = `Moderate solar radiation (UV index ${uv}).`;
    let precaution = 'Basic sun protection recommended if spending extended time outside.';

    if (uv >= 11) {
      severity = 'extreme';
      headline = 'Extreme UV Radiation Hazard';
      explanation = `Dangerous solar radiation (UV index ${uv}). Fair skin can burn in under 10 minutes.`;
      precaution = 'Avoid direct sun exposure between 10 AM and 4 PM. Wear UV-blocking sunglasses, broad-brim hat, and SPF 50+ sunscreen.';
    } else if (uv >= 8) {
      severity = 'high';
      headline = 'Very High UV Radiation';
      explanation = `Very high solar UV index of ${uv}. Rapid sunburn risk on unprotected skin.`;
      precaution = 'Seek shade around midday, wear protective clothing, UV sunglasses, and apply broad-spectrum SPF 30+ sunscreen.';
    } else if (uv >= 6) {
      severity = 'moderate';
      headline = 'High UV Radiation';
      explanation = `High solar UV index of ${uv}. Sun protection required for outdoor activities.`;
      precaution = 'Wear sunglasses and a hat; apply sunscreen every 2 hours if outdoors.';
    }

    risks.push({
      type: 'high_uv',
      severity,
      headline,
      explanation,
      measuredValue: {
        value: uv,
        unit: 'UV index',
        metric: 'uv_index',
      },
      suggestedPrecaution: precaution,
    });
  }

  // Sort risks strictly by severity descending: extreme > high > moderate > low
  risks.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);

  return risks;
}

/**
 * Determines overall categorical status based on comfort score and highest active risk.
 */
export function determineOverallStatus(
  comfortScore: number,
  highestRisk: WeatherRisk | null
): OverallWeatherStatus {
  if (
    comfortScore < 30 ||
    (highestRisk && (highestRisk.severity === 'extreme' || highestRisk.severity === 'high'))
  ) {
    return 'adverse';
  }

  if (
    comfortScore < 60 ||
    (highestRisk && highestRisk.severity === 'moderate')
  ) {
    return 'caution';
  }

  if (highestRisk && highestRisk.severity === 'low') {
    return 'favorable';
  }

  if (comfortScore >= 80) {
    return 'optimal';
  }

  return 'favorable';
}

/**
 * Generates an intuitive human-readable summary synthesizing comfort and identified risks.
 */
export function generateWeatherSummary(
  status: OverallWeatherStatus,
  comfortScore: number,
  highestRisk: WeatherRisk | null,
  conditions: Partial<CurrentWeather>
): string {
  const desc = conditions.description || 'Current weather';

  if (!highestRisk) {
    if (status === 'optimal') {
      return `Outstanding weather conditions (${desc}, Comfort Score: ${comfortScore}/100). Ideal for all outdoor and leisure activities.`;
    }
    return `Comfortable and pleasant conditions (${desc}, Comfort Score: ${comfortScore}/100) with no active weather risks detected.`;
  }

  switch (status) {
    case 'adverse':
      return `Hazardous conditions (${desc}, Comfort Score: ${comfortScore}/100). Primary concern: ${highestRisk.headline.toLowerCase()} (${highestRisk.explanation}). ${highestRisk.suggestedPrecaution}`;
    case 'caution':
      return `Noticeable weather impact (${desc}, Comfort Score: ${comfortScore}/100). Advisory: ${highestRisk.headline.toLowerCase()}. ${highestRisk.suggestedPrecaution}`;
    case 'favorable':
    case 'optimal':
    default:
      return `Overall favorable conditions (${desc}, Comfort Score: ${comfortScore}/100). Minor awareness: ${highestRisk.headline.toLowerCase()}.`;
  }
}

/**
 * Main intelligence entry point: synthesizes comprehensive weather intelligence
 * from normalized current weather domain data.
 */
export function analyzeWeather(
  current: CurrentWeather,
  fallbackLocation?: LocationInfo
): WeatherIntelligenceReport {
  const location = current.location || fallbackLocation || {
    name: 'Unknown',
    coordinates: { latitude: 0, longitude: 0 },
    timezone: 'UTC',
  };

  const comfortScore = calculateIntelligenceComfortScore(current);
  const risks = assessWeatherRisks(current);
  const highestRisk = risks.length > 0 ? risks[0] : null;
  const overallStatus = determineOverallStatus(comfortScore, highestRisk);
  const summary = generateWeatherSummary(overallStatus, comfortScore, highestRisk, current);

  return {
    location,
    overallStatus,
    comfortScore,
    highestRisk,
    summary,
    risks,
    evaluatedConditions: {
      temperatureCelsius: current.temperatureCelsius,
      feelsLikeCelsius: current.feelsLikeCelsius,
      humidityPercent: current.humidityPercent,
      windSpeedKmH: current.windSpeedKmH,
      windGustsKmH: current.windGustsKmH,
      pressureHpa: current.pressureHpa,
      precipitationMm: current.precipitationMm,
      uvIndex: current.uvIndex,
      conditionCode: current.conditionCode,
      description: current.description,
    },
    advisoryDisclaimer: ADVISORY_DISCLAIMER,
    calculatedAt: new Date().toISOString(),
  };
}
