import { describe, it, expect } from 'vitest';
import { FilterNormalizer } from '@buddy/filter-pipeline';

describe('FilterNormalizer - Text Normalization and Metadata Extraction', () => {
  it('strips UTF-8 Byte Order Mark (BOM)', () => {
    const rawWithBom = '\uFEFF! Title: List with BOM\n||ads.com^\n';
    const result = FilterNormalizer.normalize(rawWithBom);

    expect(result.normalizedContent.startsWith('\uFEFF')).toBe(false);
    expect(result.normalizedContent).toContain('||ads.com^');
    expect(result.metadata.title).toBe('List with BOM');
  });

  it('normalizes CRLF and CR line breaks to standard LF', () => {
    const rawCrlf = '||rule1.com^\r\n||rule2.com^\r||rule3.com^\n';
    const result = FilterNormalizer.normalize(rawCrlf);

    expect(result.normalizedContent).not.toContain('\r');
    expect(result.lines).toEqual(['||rule1.com^', '||rule2.com^', '||rule3.com^']);
  });

  it('trims trailing line whitespace and skips empty lines', () => {
    const rawWithSpaces = '||rule1.com^   \n\n\n   \n||rule2.com^\t\t\n';
    const result = FilterNormalizer.normalize(rawWithSpaces);

    expect(result.lines).toEqual(['||rule1.com^', '||rule2.com^']);
    expect(result.blankLines).toBe(4);
    expect(result.ruleLines).toBe(2);
  });

  it('extracts standard filter metadata headers from comments', () => {
    const rawHeader = `! Title: EasyList Test
! Version: 2026.09.22
! Last-Modified: 2026-09-22T10:00:00Z
! Homepage: https://easylist.to/
! Licence: GPLv3
! Custom-Header: value123
||adserver.com^
`;
    const result = FilterNormalizer.normalize(rawHeader);

    expect(result.metadata.title).toBe('EasyList Test');
    expect(result.metadata.version).toBe('2026.09.22');
    expect(result.metadata.lastModified).toBe('2026-09-22T10:00:00Z');
    expect(result.metadata.homepage).toBe('https://easylist.to/');
    expect(result.metadata.license).toBe('GPLv3');
    expect(result.metadata.customHeaders['custom-header']).toBe('value123');
  });

  it('is strictly deterministic: identical inputs yield identical outputs', () => {
    const raw = '! Title: Determinism\r\n||test.com^\r\n/banner-$image\r\n';
    const run1 = FilterNormalizer.normalize(raw);
    const run2 = FilterNormalizer.normalize(raw);

    expect(run1.normalizedContent).toBe(run2.normalizedContent);
    expect(run1.lines).toEqual(run2.lines);
    expect(run1.totalLines).toBe(run2.totalLines);
  });
});
