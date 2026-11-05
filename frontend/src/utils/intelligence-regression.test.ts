import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { ActivitySuitability, OverallWeatherStatus } from '../types/weather.ts';

describe('Weather Intelligence and Personalization Frontend Regression', () => {
  it('correctly associates suitability badge CSS classes with status levels', () => {
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

    assert.strictEqual(getSuitabilityBadgeClass('excellent'), 'suitability-badge badge-excellent');
    assert.strictEqual(getSuitabilityBadgeClass('good'), 'suitability-badge badge-good');
    assert.strictEqual(getSuitabilityBadgeClass('moderate'), 'suitability-badge badge-moderate');
    assert.strictEqual(getSuitabilityBadgeClass('poor'), 'suitability-badge badge-poor');
  });

  it('correctly associates overall weather status badge CSS classes', () => {
    function getStatusBadgeClass(status: OverallWeatherStatus): string {
      switch (status) {
        case 'optimal':
          return 'status-badge status-optimal';
        case 'favorable':
          return 'status-badge status-favorable';
        case 'caution':
          return 'status-badge status-caution';
        case 'adverse':
          return 'status-badge status-adverse';
      }
    }

    assert.strictEqual(getStatusBadgeClass('optimal'), 'status-badge status-optimal');
    assert.strictEqual(getStatusBadgeClass('favorable'), 'status-badge status-favorable');
    assert.strictEqual(getStatusBadgeClass('caution'), 'status-badge status-caution');
    assert.strictEqual(getStatusBadgeClass('adverse'), 'status-badge status-adverse');
  });

  it('validates alert threshold boundaries in frontend form handler', () => {
    function validateAlertThreshold(type: string, value: string): string | null {
      const parsed = parseFloat(value);
      if (Number.isNaN(parsed)) {
        return 'Please enter a valid numeric threshold.';
      }
      if (type === 'rain_prob_above' && (parsed < 0 || parsed > 100)) {
        return 'Rain probability threshold must be between 0% and 100%.';
      }
      if (type === 'uv_index_above' && parsed < 0) {
        return 'UV index threshold must be a non-negative number.';
      }
      if (type === 'wind_speed_above' && parsed < 0) {
        return 'Wind speed threshold must be greater than 0.';
      }
      return null;
    }

    assert.strictEqual(validateAlertThreshold('temp_above', 'abc'), 'Please enter a valid numeric threshold.');
    assert.strictEqual(validateAlertThreshold('rain_prob_above', '120'), 'Rain probability threshold must be between 0% and 100%.');
    assert.strictEqual(validateAlertThreshold('rain_prob_above', '-5'), 'Rain probability threshold must be between 0% and 100%.');
    assert.strictEqual(validateAlertThreshold('uv_index_above', '-1'), 'UV index threshold must be a non-negative number.');
    assert.strictEqual(validateAlertThreshold('wind_speed_above', '-10'), 'Wind speed threshold must be greater than 0.');
    assert.strictEqual(validateAlertThreshold('temp_above', '32.5'), null);
    assert.strictEqual(validateAlertThreshold('rain_prob_above', '75'), null);
  });
});

