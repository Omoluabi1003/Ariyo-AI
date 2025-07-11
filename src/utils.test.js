import { describe, it, expect } from 'vitest';
import { formatTime } from './utils.js';

describe('formatTime', () => {
  it('should format seconds into mm:ss correctly', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(120)).toBe('2:00');
    expect(formatTime(150)).toBe('2:30');
  });

  it('should handle NaN by returning 0:00', () => {
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('should handle negative numbers by returning 0:00', () => {
    expect(formatTime(-10)).toBe('0:00');
  });

  it('should handle larger numbers correctly', () => {
    expect(formatTime(3600)).toBe('60:00'); // 1 hour
    expect(formatTime(3661)).toBe('61:01'); // 1 hour, 1 minute, 1 second
  });

  it('should handle undefined or null by returning 0:00', () => {
    expect(formatTime(undefined)).toBe('0:00');
    expect(formatTime(null)).toBe('0:00');
  });
});
