import { describe, expect, it } from 'vitest';
import {
  parseCoordinates,
  parseSearchQuery,
  ValidationError,
} from './validation';

describe('Validation Helpers', () => {
  describe('parseCoordinates', () => {
    it('successfully parses valid coordinates', () => {
      const coords = parseCoordinates('7.2083', '79.8358');
      expect(coords.latitude).toBe(7.2083);
      expect(coords.longitude).toBe(79.8358);
    });

    it('successfully parses negative and edge coordinates', () => {
      const coords = parseCoordinates('-90', '180');
      expect(coords.latitude).toBe(-90);
      expect(coords.longitude).toBe(180);

      const coords2 = parseCoordinates('90', '-180');
      expect(coords2.latitude).toBe(90);
      expect(coords2.longitude).toBe(-180);
    });

    it('rejects missing or empty coordinates', () => {
      expect(() => parseCoordinates(undefined, '79.83')).toThrow(ValidationError);
      expect(() => parseCoordinates('7.20', undefined)).toThrow(ValidationError);
      expect(() => parseCoordinates('', '79.83')).toThrow(ValidationError);
      expect(() => parseCoordinates('7.20', '')).toThrow(ValidationError);
    });

    it('rejects non-numeric coordinate values', () => {
      expect(() => parseCoordinates('abc', '79.83')).toThrow(ValidationError);
      expect(() => parseCoordinates('7.20', 'xyz')).toThrow(ValidationError);
      expect(() => parseCoordinates('NaN', '79.83')).toThrow(ValidationError);
    });

    it('rejects out of bounds latitude', () => {
      expect(() => parseCoordinates('90.0001', '0')).toThrow(ValidationError);
      expect(() => parseCoordinates('-91', '0')).toThrow(ValidationError);
    });

    it('rejects out of bounds longitude', () => {
      expect(() => parseCoordinates('0', '180.0001')).toThrow(ValidationError);
      expect(() => parseCoordinates('0', '-181')).toThrow(ValidationError);
    });
  });

  describe('parseSearchQuery', () => {
    it('successfully parses valid query and sets default limit', () => {
      const result = parseSearchQuery('Negombo');
      expect(result.query).toBe('Negombo');
      expect(result.limit).toBe(10);
    });

    it('trims whitespace from query', () => {
      const result = parseSearchQuery('  Colombo  ');
      expect(result.query).toBe('Colombo');
    });

    it('parses valid custom limit and caps at 20', () => {
      const result1 = parseSearchQuery('Paris', '5');
      expect(result1.limit).toBe(5);

      const result2 = parseSearchQuery('Paris', '50');
      expect(result2.limit).toBe(20);
    });

    it('rejects empty or whitespace query', () => {
      expect(() => parseSearchQuery('')).toThrow(ValidationError);
      expect(() => parseSearchQuery('   ')).toThrow(ValidationError);
      expect(() => parseSearchQuery(undefined)).toThrow(ValidationError);
    });

    it('rejects queries shorter than 2 characters', () => {
      expect(() => parseSearchQuery('a')).toThrow(ValidationError);
      expect(() => parseSearchQuery(' a ')).toThrow(ValidationError);
    });

    it('rejects invalid limit values', () => {
      expect(() => parseSearchQuery('Tokyo', '-1')).toThrow(ValidationError);
      expect(() => parseSearchQuery('Tokyo', '0')).toThrow(ValidationError);
      expect(() => parseSearchQuery('Tokyo', 'abc')).toThrow(ValidationError);
      expect(() => parseSearchQuery('Tokyo', '2.5')).toThrow(ValidationError);
    });
  });
});

