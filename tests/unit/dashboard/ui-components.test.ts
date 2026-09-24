import { describe, it, expect } from 'vitest';
import { formatDurationMs } from '@buddy/ui-components';

describe('UI Components - Pure Data Presentation & Accessibility', () => {
  describe('formatDurationMs Helper', () => {
    it('formats seconds correctly under 1 minute', () => {
      expect(formatDurationMs(45_000)).toBe('45s');
    });

    it('formats minutes correctly under 1 hour', () => {
      expect(formatDurationMs(25 * 60 * 1000)).toBe('25m');
    });

    it('formats hours and minutes correctly', () => {
      expect(formatDurationMs(95 * 60 * 1000)).toBe('1h 35m');
    });

    it('handles exact zero duration', () => {
      expect(formatDurationMs(0)).toBe('0s');
    });
  });

  describe('Zero-Data Presentation Guarantees', () => {
    it('produces clean empty state strings rather than fake placeholders', () => {
      const activeMs = 0;
      expect(formatDurationMs(activeMs)).toBe('0s');
    });
  });
});
