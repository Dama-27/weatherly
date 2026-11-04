import { describe, expect, it } from 'vitest';
import {
  celsiusToKelvin,
  kelvinToCelsius,
  kmhToMps,
  mpsToKmh,
  roundTo,
} from './units';

describe('Unit Conversion Utilities', () => {
  describe('roundTo', () => {
    it('rounds to specified decimal places', () => {
      expect(roundTo(23.456, 1)).toBe(23.5);
      expect(roundTo(23.456, 2)).toBe(23.46);
      expect(roundTo(23.456, 0)).toBe(23);
    });

    it('handles edge numbers like NaN and Infinity', () => {
      expect(Number.isNaN(roundTo(NaN))).toBe(true);
      expect(roundTo(Infinity)).toBe(Infinity);
    });
  });

  describe('kelvinToCelsius', () => {
    it('converts absolute zero correctly', () => {
      expect(kelvinToCelsius(0)).toBe(-273.15);
    });

    it('converts freezing point of water (273.15 K) to 0 °C', () => {
      expect(kelvinToCelsius(273.15)).toBe(0);
    });

    it('converts typical ambient temperatures', () => {
      expect(kelvinToCelsius(298.15)).toBe(25);
      expect(kelvinToCelsius(300)).toBe(26.85);
    });
  });

  describe('celsiusToKelvin', () => {
    it('converts 0 °C to 273.15 K', () => {
      expect(celsiusToKelvin(0)).toBe(273.15);
    });

    it('converts ambient Celsius to Kelvin', () => {
      expect(celsiusToKelvin(25)).toBe(298.15);
      expect(celsiusToKelvin(-10)).toBe(263.15);
    });

    it('is reversible with kelvinToCelsius', () => {
      const originalC = 22.5;
      const kelvin = celsiusToKelvin(originalC);
      expect(kelvinToCelsius(kelvin)).toBe(originalC);
    });
  });

  describe('mpsToKmh', () => {
    it('converts 0 m/s to 0 km/h', () => {
      expect(mpsToKmh(0)).toBe(0);
    });

    it('converts 1 m/s to 3.6 km/h', () => {
      expect(mpsToKmh(1)).toBe(3.6);
    });

    it('converts 10 m/s to 36 km/h', () => {
      expect(mpsToKmh(10)).toBe(36);
    });

    it('converts realistic wind speeds', () => {
      expect(mpsToKmh(3)).toBe(10.8);
      expect(mpsToKmh(5.5)).toBe(19.8);
    });
  });

  describe('kmhToMps', () => {
    it('converts 0 km/h to 0 m/s', () => {
      expect(kmhToMps(0)).toBe(0);
    });

    it('converts 36 km/h to 10 m/s', () => {
      expect(kmhToMps(36)).toBe(10);
    });

    it('is reversible with mpsToKmh', () => {
      const originalMps = 15;
      const kmh = mpsToKmh(originalMps);
      expect(kmhToMps(kmh)).toBe(originalMps);
    });
  });
});

