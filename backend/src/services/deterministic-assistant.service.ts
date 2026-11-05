import type {
  AssistantWeatherContext,
  IAssistantProvider,
} from '../types/assistant.types';

export class DeterministicAssistantService implements IAssistantProvider {
  readonly providerName = 'rules' as const;

  isAvailable(): boolean {
    return true;
  }

  async generateAnswer(
    question: string,
    context: AssistantWeatherContext
  ): Promise<string> {
    const q = question.toLowerCase().trim();
    const locationName = context.current.location.name || 'your area';

    // 1. Running / Jogging
    if (q.includes('running') || q.includes('run') || q.includes('jog')) {
      const runningAct = context.recommendations.activities.find((a) => a.activity === 'Running');
      const suitability = runningAct?.suitability || 'moderate';
      const reason = runningAct?.reason || 'Evaluate current temperature and hydration.';

      let eveningNote = '';
      if (q.includes('evening') || q.includes('tonight')) {
        // Inspect evening hours between 17:00 and 21:00 (timezone-independent string slice)
        const eveningHours = context.hourly.filter((h) => {
          const hourNum = parseInt(h.timestamp.slice(11, 13), 10);
          return !Number.isNaN(hourNum) && hourNum >= 17 && hourNum <= 21;
        });

        if (eveningHours.length > 0) {
          const maxRainProb = Math.max(...eveningHours.map((h) => h.precipitationProbabilityPercent ?? 0));
          const avgTemp = Math.round(
            eveningHours.reduce((acc, h) => acc + h.temperatureCelsius, 0) / eveningHours.length
          );
          eveningNote = ` For this evening, temperatures will hover around ${avgTemp}°C with a rain probability of ${maxRainProb}%.`;
        }
      }

      const bestWindow = runningAct?.bestTimeWindow
        ? ` The best suggested time window is ${runningAct.bestTimeWindow}.`
        : context.recommendations.bestOutdoorWindow
        ? ` The optimal outdoor window is ${context.recommendations.bestOutdoorWindow.label}.`
        : '';

      return `For running in ${locationName}, conditions are currently rated ${suitability.toUpperCase()}. ${reason}${eveningNote}${bestWindow}`;
    }

    // 2. Cycling / Biking
    if (q.includes('cycling') || q.includes('cycle') || q.includes('bike') || q.includes('biking')) {
      const act = context.recommendations.activities.find((a) => a.activity === 'Cycling');
      const suitability = act?.suitability || 'moderate';
      const reason = act?.reason || 'Check wind speeds and road wetness.';
      const bestWindow = act?.bestTimeWindow
        ? ` Recommended window: ${act.bestTimeWindow}.`
        : context.recommendations.bestOutdoorWindow
        ? ` Best outdoor window: ${context.recommendations.bestOutdoorWindow.label}.`
        : '';

      return `Cycling conditions in ${locationName} are currently rated ${suitability.toUpperCase()}. ${reason}${bestWindow}`;
    }

    // 3. Walking / Outdoor sports / Beach / Hiking / Gardening
    const matchedActivity = context.recommendations.activities.find((a) =>
      q.includes(a.activity.toLowerCase())
    );
    if (matchedActivity) {
      const bestWindow = matchedActivity.bestTimeWindow
        ? ` Recommended time window: ${matchedActivity.bestTimeWindow}.`
        : context.recommendations.bestOutdoorWindow
        ? ` Optimal outdoor window: ${context.recommendations.bestOutdoorWindow.label}.`
        : '';

      return `Conditions for ${matchedActivity.activity.toLowerCase()} in ${locationName} are currently ${matchedActivity.suitability.toUpperCase()}. ${matchedActivity.reason}${bestWindow}`;
    }

    // 4. Rain / Precipitation / Umbrella / Tomorrow's rain
    if (
      q.includes('rain') ||
      q.includes('raining') ||
      q.includes('umbrella') ||
      q.includes('precipitation') ||
      q.includes('shower') ||
      q.includes('storm')
    ) {
      if (q.includes('tomorrow') || q.includes('next day')) {
        const tomorrow = context.daily[1] || context.daily[0];
        if (tomorrow) {
          const rainProb = tomorrow.precipitationProbabilityMaxPercent ?? 0;
          const rainSum = tomorrow.precipitationSumMm ?? 0;
          const advice =
            rainProb >= 40
              ? 'Carrying an umbrella is recommended as rain is probable.'
              : 'Rain is unlikely tomorrow based on current forecast models.';

          return `Tomorrow in ${locationName}, the maximum rain probability is ${rainProb}% with ${rainSum} mm expected precipitation (${tomorrow.description}). Temperatures will range between ${tomorrow.minTemperatureCelsius}°C and ${tomorrow.maxTemperatureCelsius}°C. ${advice}`;
        }
      }

      // Today's rain check
      const currentRain = context.current.precipitationMm;
      const upcomingRainHours = context.hourly.slice(0, 12).filter((h) => (h.precipitationProbabilityPercent ?? 0) >= 40);

      if (currentRain > 0) {
        return `It is currently raining in ${locationName} (${currentRain} mm). You should definitely carry an umbrella or waterproof jacket.`;
      }

      if (upcomingRainHours.length > 0) {
        const peakProb = Math.max(...upcomingRainHours.map((h) => h.precipitationProbabilityPercent ?? 0));
        return `While it is not raining right now in ${locationName}, rain probability rises up to ${peakProb}% within the next 12 hours. Carrying a compact umbrella is advised.`;
      }

      return `Rain is not currently expected in ${locationName}. Current precipitation is 0 mm and near-term probability remains low.`;
    }

    // 5. Clothing / Attire / What to wear
    if (
      q.includes('wear') ||
      q.includes('clothing') ||
      q.includes('clothes') ||
      q.includes('jacket') ||
      q.includes('coat') ||
      q.includes('outfit') ||
      q.includes('attire')
    ) {
      const primaryClothing = context.recommendations.clothing.find((c) => c.isPrimary) || context.recommendations.clothing[0];
      const itemsList = primaryClothing?.items.join(', ') || 'comfortable everyday clothes';
      const reason = primaryClothing?.reason || `Current temperature is ${context.current.temperatureCelsius}°C.`;

      const extraAdvice: string[] = [];
      const hasRainProtection = context.recommendations.clothing.some((c) => c.category === 'rain_protection');
      if (hasRainProtection) {
        extraAdvice.push('Pack an umbrella or rain-resistant outer layer.');
      }

      const hasSunProtection = context.recommendations.clothing.some((c) => c.category === 'sun_protection');
      if (hasSunProtection) {
        extraAdvice.push('Bring sunglasses and apply sunscreen (UV index is ' + context.current.uvIndex + ').');
      }

      const extras = extraAdvice.length > 0 ? ` ${extraAdvice.join(' ')}` : '';
      return `For today in ${locationName}: Wear ${itemsList}. ${reason}${extras}`;
    }

    // 6. Comfort Score / Comfort Index / Why is it low/high
    if (
      q.includes('comfort') ||
      q.includes('score') ||
      q.includes('why') ||
      q.includes('pleasant') ||
      q.includes('uncomfortable') ||
      q.includes('index')
    ) {
      const score = context.intelligence.comfortScore;
      const status = context.intelligence.overallStatus || 'favorable';
      const primaryDriver = context.intelligence.summary || 'Conditions evaluated from temperature, humidity, wind, and rain';
      const risks = context.intelligence.risks || [];

      const riskDesc =
        risks.length > 0
          ? `Active weather considerations: ${risks.map((r) => r.headline).join('; ')}.`
          : 'There are no active weather hazards.';

      return `The current Comfort Score for ${locationName} is ${score}/100 (${status.toUpperCase()}). ${primaryDriver}. Current conditions: ${context.current.temperatureCelsius}°C (feels like ${context.current.feelsLikeCelsius}°C), ${context.current.humidityPercent}% humidity, and ${context.current.windSpeedKmH} km/h wind. ${riskDesc}`;
    }

    // 7. Best time / Optimal outdoor window
    if (
      q.includes('best time') ||
      q.includes('optimal') ||
      q.includes('when should i') ||
      q.includes('window')
    ) {
      const window = context.recommendations.bestOutdoorWindow;
      if (window) {
        return `The best outdoor window in ${locationName} is ${window.label} with a predicted comfort score of ${window.comfortScore}/100. ${window.reason}`;
      }
      return `Current outdoor conditions in ${locationName} are relatively steady around ${context.current.temperatureCelsius}°C. Early morning or late afternoon typically provides the most comfortable conditions.`;
    }

    // 8. Tomorrow's general forecast
    if (q.includes('tomorrow')) {
      const tomorrow = context.daily[1] || context.daily[0];
      if (tomorrow) {
        return `Tomorrow in ${locationName}, expect ${tomorrow.description.toLowerCase()} conditions with temperatures between ${tomorrow.minTemperatureCelsius}°C and ${tomorrow.maxTemperatureCelsius}°C. Rain probability is ${tomorrow.precipitationProbabilityMaxPercent ?? 0}% and peak UV index is ${tomorrow.uvIndexMax ?? 'moderate'}.`;
      }
    }

    // 9. General weather inquiry
    if (
      q.includes('weather') ||
      q.includes('temperature') ||
      q.includes('forecast') ||
      q.includes('hot') ||
      q.includes('cold') ||
      q.includes('today')
    ) {
      return `Currently in ${locationName}, it is ${context.current.temperatureCelsius}°C (feels like ${context.current.feelsLikeCelsius}°C) with ${context.current.description.toLowerCase()}. Humidity is ${context.current.humidityPercent}% and wind speed is ${context.current.windSpeedKmH} km/h. Overall comfort is rated ${context.intelligence.overallStatus || 'favorable'}.`;
    }

    // 10. Unsupported / Non-weather question
    return `I am Weatherly's weather copilot. I can answer questions about current conditions, forecasts, outdoor activity suitability (running, cycling, walking), clothing recommendations, and comfort scores. I cannot assist with non-weather topics.`;
  }
}
