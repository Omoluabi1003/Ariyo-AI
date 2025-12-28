const { computeBackoffDelay } = require('../scripts/audio-recovery-utils');

describe('computeBackoffDelay', () => {
  it('returns a positive delay within bounds', () => {
    const delay = computeBackoffDelay(1, 2000, 15000, 0.2);
    expect(delay).toBeGreaterThanOrEqual(2000);
    expect(delay).toBeLessThanOrEqual(18000);
  });

  it('increases as attempt grows, capped at max', () => {
    const first = computeBackoffDelay(1, 1000, 5000, 0);
    const second = computeBackoffDelay(3, 1000, 5000, 0);
    const third = computeBackoffDelay(10, 1000, 5000, 0);
    expect(second).toBeGreaterThanOrEqual(first);
    expect(third).toBe(5000);
  });
});
