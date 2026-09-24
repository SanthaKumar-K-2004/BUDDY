import { describe, it, expect } from 'vitest';
import { FilterNormalizer, FilterParser, DnrConverter, RuleDeduplicator, RulesetValidator } from '@buddy/filter-pipeline';

describe('Performance Smoke Test - Ingestion & Conversion Speed', () => {
  it('measures execution time for 1,000 synthetic rules across pipeline stages', async () => {
    // Generate 1,000 synthetic rules
    const rawLines: string[] = [];
    for (let i = 0; i < 1000; i++) {
      if (i % 5 === 0) {
        rawLines.push(`! Comment rule ${i}`);
      } else if (i % 10 === 0) {
        rawLines.push(`@@||allowed-site-${i}.com/lib.js$script`);
      } else if (i % 7 === 0) {
        rawLines.push(`127.0.0.1 host-${i}.adserver.net`);
      } else {
        rawLines.push(`||ad-tracker-${i}.com^$third-party,image`);
      }
    }
    const rawText = rawLines.join('\r\n');

    // 1. Normalization
    const t0 = performance.now();
    const normalized = FilterNormalizer.normalize(rawText);
    const tNorm = performance.now() - t0;

    expect(normalized.lines.length).toBeGreaterThan(900);
    expect(tNorm).toBeLessThan(100); // Sub-100ms

    // 2. Parsing
    const t1 = performance.now();
    const parsed = FilterParser.parse('perf-test', normalized.lines);
    const tParse = performance.now() - t1;

    expect(parsed.networkRules.length).toBeGreaterThanOrEqual(800);
    expect(tParse).toBeLessThan(500); // Sub-500ms

    // 3. Conversion
    const t2 = performance.now();
    const converted = await DnrConverter.convertList('ruleset_perf', normalized.normalizedContent);
    const tConvert = performance.now() - t2;

    expect(converted.rules.length).toBeGreaterThanOrEqual(800);
    expect(tConvert).toBeLessThan(1000); // Sub-1000ms

    // 4. Deduplication
    const t3 = performance.now();
    const dedup = RuleDeduplicator.deduplicate(converted.rules);
    const tDedup = performance.now() - t3;

    expect(dedup.rules.length).toBeGreaterThanOrEqual(800);
    expect(tDedup).toBeLessThan(100); // Sub-100ms

    // 5. Validation
    const t4 = performance.now();
    const report = RulesetValidator.validate('ruleset_perf', dedup.rules);
    const tVal = performance.now() - t4;

    expect(report.isValid).toBe(true);
    expect(tVal).toBeLessThan(100); // Sub-100ms

    const totalTime = tNorm + tParse + tConvert + tDedup + tVal;
    expect(totalTime).toBeLessThan(2000); // Total pipeline < 2 seconds for 1,000 rules
  });
});
