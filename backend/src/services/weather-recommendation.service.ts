import type { CurrentWeather, HourlyForecast } from '../types/weather-domain.types';
import type {
  ActivityName,
  ActivityRecommendation,
  ActivitySuitability,
  BestOutdoorWindow,
  ClothingRecommendation,
  WeatherRecommendationsReport,
} from '../types/weather-recommendation.types';
import {
  analyzeWeather,
  calculateIntelligenceComfortScore,
} from './weather-intelligence.service';

/**
 * Evaluates outdoor activities against actual atmospheric conditions.
 * Reuses comfort score and risk assessment principles from the Weather Intelligence Engine.
 */
export function evaluateActivities(
  current: CurrentWeather,
  hourly?: HourlyForecast[]
): ActivityRecommendation[] {
  const temp = current.temperatureCelsius;
  const feelsLike = current.feelsLikeCelsius;
  const rain = current.precipitationMm;
  const wind = Math.max(current.windSpeedKmH, current.windGustsKmH ?? 0);
  const uv = current.uvIndex;
  const conditionCode = typeof current.conditionCode === 'number'
    ? current.conditionCode
    : Number(current.conditionCode);
  const isThunderstorm = [95, 96, 99].includes(conditionCode);

  const bestWindow = hourly && hourly.length > 0 ? findBestOutdoorWindow(hourly, current.location.timezone) : null;
  const bestTimeLabel = bestWindow?.label;

  const activities: ActivityName[] = [
    'Walking',
    'Running',
    'Cycling',
    'Outdoor sports',
    'Beach activities',
    'Hiking',
    'Gardening',
  ];

  return activities.map((activity) => {
    let suitability: ActivitySuitability = 'good';
    let reason = 'Conditions are generally suitable.';

    if (isThunderstorm) {
      return {
        activity,
        suitability: 'poor',
        reason: 'Thunderstorm activity presents dangerous lightning risks.',
        bestTimeWindow: bestTimeLabel,
      };
    }

    if (rain >= 10) {
      return {
        activity,
        suitability: 'poor',
        reason: `Heavy rainfall (${rain} mm) creates hazardous wet conditions.`,
        bestTimeWindow: bestTimeLabel,
      };
    }

    switch (activity) {
      case 'Walking': {
        if (feelsLike >= 18 && feelsLike <= 25 && rain === 0 && wind < 25) {
          suitability = 'excellent';
          reason = `Comfortable temperature (${feelsLike}°C) and calm conditions.`;
        } else if (feelsLike >= 35 || feelsLike <= 2 || rain >= 4 || wind >= 45) {
          suitability = 'poor';
          reason = feelsLike >= 35 ? 'Excessive heat index.' : rain >= 4 ? 'Persistent rain.' : 'Unfavorable weather.';
        } else if (feelsLike >= 30 || feelsLike <= 10 || rain >= 1 || wind >= 30) {
          suitability = 'moderate';
          reason = feelsLike >= 30 ? 'Warm weather; carry water.' : rain >= 1 ? 'Light showers possible.' : 'Noticeable breeze.';
        } else {
          suitability = 'good';
          reason = 'Fair conditions for a stroll.';
        }
        break;
      }

      case 'Running': {
        // High metabolic exertion: ideal is cooler (10-22°C)
        if (feelsLike >= 10 && feelsLike <= 22 && rain === 0 && wind < 20) {
          suitability = 'excellent';
          reason = `Crisp, cool temperature (${feelsLike}°C) optimal for aerobic endurance.`;
        } else if (feelsLike >= 30 || feelsLike <= 0 || rain >= 3 || wind >= 35) {
          suitability = 'poor';
          reason = feelsLike >= 30 ? `Heat stress hazard (${feelsLike}°C). Risk of overheating.` : 'Harsh conditions for running.';
        } else if (feelsLike >= 24 || feelsLike <= 6 || rain >= 0.5 || wind >= 25) {
          suitability = 'moderate';
          reason = feelsLike >= 24 ? 'Warm for running; hydrate frequently.' : 'Sub-optimal running weather.';
        } else {
          suitability = 'good';
          reason = 'Favorable weather for jogging.';
        }
        break;
      }

      case 'Cycling': {
        if (feelsLike >= 16 && feelsLike <= 24 && rain === 0 && wind < 15) {
          suitability = 'excellent';
          reason = 'Dry pavement and minimal wind resistance.';
        } else if (wind >= 40 || rain >= 3 || feelsLike >= 36 || feelsLike <= 0) {
          suitability = 'poor';
          reason = wind >= 40 ? `Dangerous wind resistance (${wind} km/h).` : rain >= 3 ? 'Slick roadway traction.' : 'Extreme temperatures.';
        } else if (wind >= 25 || rain >= 0.5 || feelsLike >= 30) {
          suitability = 'moderate';
          reason = wind >= 25 ? `Moderate headwind (${wind} km/h).` : 'Damp roads or warm air.';
        } else {
          suitability = 'good';
          reason = 'Pleasant conditions for riding.';
        }
        break;
      }

      case 'Outdoor sports': {
        if (feelsLike >= 16 && feelsLike <= 24 && rain === 0 && wind < 18) {
          suitability = 'excellent';
          reason = 'Dry playing surface and comfortable active temperature.';
        } else if (rain >= 2 || wind >= 35 || feelsLike >= 34 || feelsLike <= 2) {
          suitability = 'poor';
          reason = rain >= 2 ? 'Wet courts/fields increase slipping risk.' : wind >= 35 ? 'High wind disrupts ball flight.' : 'Thermal discomfort.';
        } else if (rain > 0 || wind >= 22 || feelsLike >= 29) {
          suitability = 'moderate';
          reason = feelsLike >= 29 ? 'Warm conditions; take frequent hydration breaks.' : 'Breezy conditions.';
        } else {
          suitability = 'good';
          reason = 'Good conditions for outdoor play.';
        }
        break;
      }

      case 'Beach activities': {
        if (temp >= 24 && temp <= 32 && rain === 0 && wind < 25) {
          suitability = 'excellent';
          reason = `Warm (${temp}°C) and dry coastal weather.`;
        } else if (temp < 20 || rain >= 2 || wind >= 35) {
          suitability = 'poor';
          reason = temp < 20 ? 'Too chilly for seaside activities.' : rain >= 2 ? 'Rainy weather.' : 'Rough coastal winds.';
        } else if (temp < 24 || rain > 0 || wind >= 25 || uv >= 11) {
          suitability = 'moderate';
          reason = uv >= 11 ? 'Extreme UV; beach requires sunshades.' : 'Cooler breeze or light drizzle.';
        } else {
          suitability = 'good';
          reason = 'Suitable weather for the coast.';
        }
        break;
      }

      case 'Hiking': {
        if (feelsLike >= 14 && feelsLike <= 22 && rain === 0 && wind < 25) {
          suitability = 'excellent';
          reason = 'Firm, dry trail conditions and pleasant hiking temperatures.';
        } else if (rain >= 3 || feelsLike >= 34 || feelsLike <= 2 || wind >= 40) {
          suitability = 'poor';
          reason = rain >= 3 ? 'Muddy, slippery trails and poor footing.' : feelsLike >= 34 ? 'Exhaustive heat on trails.' : 'Challenging terrain conditions.';
        } else if (rain > 0 || feelsLike >= 28 || wind >= 25) {
          suitability = 'moderate';
          reason = 'Damp trails or warmer conditions; wear sturdy boots and pack water.';
        } else {
          suitability = 'good';
          reason = 'Favorable weather for trail walks.';
        }
        break;
      }

      case 'Gardening': {
        if (feelsLike >= 16 && feelsLike <= 24 && rain === 0 && wind < 20) {
          suitability = 'excellent';
          reason = 'Mild temperatures and comfortable soil-work conditions.';
        } else if (rain >= 5 || feelsLike >= 36 || feelsLike <= 3 || wind >= 40) {
          suitability = 'poor';
          reason = rain >= 5 ? 'Waterlogged soil.' : feelsLike >= 36 ? 'Intense heat for outdoor yard work.' : 'Unfavorable yard conditions.';
        } else if (rain > 0.5 || feelsLike >= 30 || wind >= 25) {
          suitability = 'moderate';
          reason = feelsLike >= 30 ? 'Garden early or late to avoid midday sun.' : 'Light dampness.';
        } else {
          suitability = 'good';
          reason = 'Fine weather for yard and plant care.';
        }
        break;
      }
    }

    return {
      activity,
      suitability,
      reason,
      bestTimeWindow: bestTimeLabel,
    };
  });
}

/**
 * Generates tailored clothing suggestions derived from actual temperature,
 * apparent temperature, precipitation, wind, and UV indices.
 */
export function generateClothingRecommendations(
  current: CurrentWeather
): ClothingRecommendation[] {
  const suggestions: ClothingRecommendation[] = [];
  const feelsLike = current.feelsLikeCelsius;
  const rain = current.precipitationMm;
  const wind = Math.max(current.windSpeedKmH, current.windGustsKmH ?? 0);
  const uv = current.uvIndex;

  // 1. Light vs. Warm Clothing
  if (feelsLike >= 24) {
    suggestions.push({
      category: 'light_clothing',
      title: 'Light & Breathable Attire',
      items: ['Short-sleeve shirt / T-shirt', 'Shorts or light trousers', 'Breathable cotton / linen fabrics'],
      reason: `Warm conditions with an apparent temperature of ${feelsLike}°C.`,
      isPrimary: true,
    });
  } else if (feelsLike < 12) {
    suggestions.push({
      category: 'warm_clothing',
      title: 'Heavy Cold Protection',
      items: ['Winter coat / down jacket', 'Thermal base layers', 'Warm gloves & beanie'],
      reason: `Chilly apparent temperature of ${feelsLike}°C.`,
      isPrimary: true,
    });
  } else if (feelsLike < 18) {
    suggestions.push({
      category: 'warm_clothing',
      title: 'Light Layering',
      items: ['Sweater / fleece jacket', 'Long pants', 'Light scarf or pullover'],
      reason: `Cool conditions with an apparent temperature of ${feelsLike}°C.`,
      isPrimary: true,
    });
  } else {
    suggestions.push({
      category: 'light_clothing',
      title: 'Mild Daily Wear',
      items: ['Long-sleeve shirt or light cardigan', 'Casual trousers or jeans'],
      reason: `Moderate, comfortable apparent temperature of ${feelsLike}°C.`,
      isPrimary: true,
    });
  }

  // 2. Rain Protection
  if (rain > 0.2 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(Number(current.conditionCode))) {
    suggestions.push({
      category: 'rain_protection',
      title: 'Rain Gear',
      items: ['Compact umbrella', 'Waterproof rain jacket', 'Water-resistant shoes'],
      reason: rain > 0 ? `Active precipitation (${rain} mm) detected.` : 'Showers or rain in the area.',
      isPrimary: rain >= 2.0,
    });
  }

  // 3. Sun Protection
  if (uv >= 3) {
    suggestions.push({
      category: 'sun_protection',
      title: 'Sun Protection',
      items: ['UV-rated sunglasses', 'Wide-brim hat or cap', uv >= 6 ? 'Broad-spectrum SPF 30+ sunscreen' : 'Sunscreen for prolonged exposure'],
      reason: `Elevated solar radiation with a UV index of ${uv}.`,
      isPrimary: uv >= 8,
    });
  }

  // 4. Wind Protection
  if (wind >= 25) {
    suggestions.push({
      category: 'wind_protection',
      title: 'Wind Defense',
      items: ['Windbreaker jacket', 'Secured eyewear', 'Avoid loose accessories'],
      reason: `Wind speeds reaching ${wind} km/h.`,
      isPrimary: wind >= 40,
    });
  }

  return suggestions;
}

/**
 * Discovers the continuous 2-to-4 hour window with the highest composite comfort
 * within the next 24 hours of hourly forecast data.
 */
export function findBestOutdoorWindow(
  hourly: HourlyForecast[],
  timezone?: string
): BestOutdoorWindow | null {
  if (!hourly || hourly.length < 3) {
    return null;
  }

  // Evaluate the next 24 hours
  const next24 = hourly.slice(0, 24);

  // Score each hour using the deterministic comfort score
  const scoredHours = next24.map((item, idx) => ({
    index: idx,
    rawTimestamp: item.timestamp,
    score: calculateIntelligenceComfortScore(item),
    isRainy: (item.precipitationMm ?? 0) > 0.5,
    isExtremeHeat: (item.feelsLikeCelsius ?? 0) > 34,
    uv: item.uvIndex ?? 0,
    item,
  }));

  // Find the continuous 3-hour sliding window with maximum average score
  let bestAvg = -1;
  let bestWindowStartIdx = -1;
  const windowSize = 3;

  for (let i = 0; i <= scoredHours.length - windowSize; i++) {
    const slice = scoredHours.slice(i, i + windowSize);
    const avgScore = slice.reduce((acc, h) => acc + h.score, 0) / windowSize;

    // Heavily penalize windows with active rain
    const rainPenalty = slice.some((h) => h.isRainy) ? 30 : 0;
    const heatPenalty = slice.some((h) => h.isExtremeHeat) ? 15 : 0;
    const adjusted = avgScore - rainPenalty - heatPenalty;

    if (adjusted > bestAvg) {
      bestAvg = adjusted;
      bestWindowStartIdx = i;
    }
  }

  if (bestWindowStartIdx === -1) {
    return null;
  }

  const startHour = scoredHours[bestWindowStartIdx];
  const endHour = scoredHours[bestWindowStartIdx + windowSize - 1];

  const formatHour = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone && timezone !== 'UTC' ? timezone : undefined,
      }).format(date);
    } catch {
      return isoStr.split('T')[1]?.slice(0, 5) || isoStr;
    }
  };

  const startTime = formatHour(startHour.rawTimestamp);
  const endTime = formatHour(endHour.rawTimestamp);

  return {
    startTime: startHour.rawTimestamp,
    endTime: endHour.rawTimestamp,
    label: `${startTime} – ${endTime}`,
    comfortScore: Math.round(bestAvg),
    reason: `Highest predicted comfort (${Math.round(bestAvg)}/100) with minimal precipitation risk.`,
  };
}

/**
 * Generates concise daily weather tips grounded directly in actual atmospheric values.
 */
export function generateDailyAdvice(
  current: CurrentWeather,
  bestWindow: BestOutdoorWindow | null
): string[] {
  const advice: string[] = [];
  const feelsLike = current.feelsLikeCelsius;
  const rain = current.precipitationMm;
  const wind = Math.max(current.windSpeedKmH, current.windGustsKmH ?? 0);
  const uv = current.uvIndex;
  const isThunderstorm = [95, 96, 99].includes(Number(current.conditionCode));

  if (isThunderstorm) {
    advice.push('Thunderstorms detected in the area — remain indoors and avoid open terrain.');
  } else if (rain >= 5) {
    advice.push(`Heavy rain observed (${rain} mm). Consider indoor activities and exercise caution on wet roads.`);
  } else if (rain > 0.2) {
    advice.push('Light precipitation present. Remember to carry an umbrella or rain-resistant jacket.');
  }

  if (uv >= 8) {
    advice.push(`UV index is very high (${uv}). Seek shade and avoid prolonged sun exposure during peak midday hours.`);
  } else if (uv >= 6) {
    advice.push(`UV levels are elevated (${uv}). Apply sun protection if spending extended time outside.`);
  }

  if (feelsLike >= 36) {
    advice.push(`Intense apparent temperature (${feelsLike}°C). Maintain constant hydration and take frequent rest breaks.`);
  } else if (feelsLike <= 5) {
    advice.push(`Freezing or near-freezing chill (${feelsLike}°C). Bundle up in warm layers before heading out.`);
  }

  if (wind >= 40) {
    advice.push(`High wind gusts reaching ${wind} km/h. Secure loose outdoor belongings and take care when driving.`);
  }

  if (bestWindow) {
    advice.push(`Best window for outdoor exercise or walks is ${bestWindow.label} (Comfort: ${bestWindow.comfortScore}/100).`);
  } else if (advice.length === 0) {
    advice.push('Calm and pleasant weather throughout the day — enjoy your outdoor activities.');
  }

  return advice;
}

/**
 * Main smart recommendations coordinator: builds activities, clothing,
 * advice, and best time window from normalized weather domain objects.
 */
export function generateRecommendations(
  current: CurrentWeather,
  hourly?: HourlyForecast[]
): WeatherRecommendationsReport {
  const intelligence = analyzeWeather(current);
  const bestOutdoorWindow = hourly && hourly.length > 0 ? findBestOutdoorWindow(hourly, current.location.timezone) : null;
  const activities = evaluateActivities(current, hourly);
  const clothing = generateClothingRecommendations(current);
  const dailyAdvice = generateDailyAdvice(current, bestOutdoorWindow);

  return {
    location: current.location,
    comfortScore: intelligence.comfortScore,
    overallStatus: intelligence.overallStatus,
    activities,
    clothing,
    dailyAdvice,
    bestOutdoorWindow,
    calculatedAt: new Date().toISOString(),
  };
}
