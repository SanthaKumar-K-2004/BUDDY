import { describe, it, expect, beforeEach } from 'vitest';
import { FilterSourceRegistry, DEFAULT_FILTER_SOURCES, type FilterSource } from '@buddy/filter-pipeline';

describe('FilterSourceRegistry - Source Catalog and Validation', () => {
  let registry: FilterSourceRegistry;

  beforeEach(() => {
    registry = new FilterSourceRegistry();
  });

  it('initializes with default vetted sources', () => {
    const sources = registry.getAllSources();
    expect(sources.length).toBe(DEFAULT_FILTER_SOURCES.length);
    expect(sources.map((s) => s.id)).toContain('easylist');
    expect(sources.map((s) => s.id)).toContain('easyprivacy');
    expect(sources.map((s) => s.id)).toContain('peter-lowe');
  });

  it('allows registering a valid custom source', () => {
    const customSource: FilterSource = {
      id: 'custom-malware-list',
      name: 'Custom Malware List',
      url: 'https://security.example.org/malware.txt',
      format: 'adblock',
      license: 'MIT',
      licenseUrl: 'https://opensource.org/licenses/MIT',
      maintainer: 'Security Team',
      category: 'MALWARE',
      enabled: true,
      trusted: true,
      updatePolicy: 'daily',
      description: 'Daily malware domain protection',
    };

    registry.registerSource(customSource);
    const retrieved = registry.getSource('custom-malware-list');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Custom Malware List');
    expect(retrieved?.category).toBe('MALWARE');
  });

  it('rejects duplicate source IDs', () => {
    const duplicate: FilterSource = {
      ...registry.getSource('easylist')!,
      name: 'Conflicting EasyList',
    };

    expect(() => registry.registerSource(duplicate)).toThrow(/Duplicate filter source ID/);
  });

  it('rejects source with invalid or malformed ID', () => {
    const invalidIdSource: FilterSource = {
      id: 'invalid id with spaces!',
      name: 'Invalid ID List',
      url: 'https://example.org/list.txt',
      format: 'adblock',
      license: 'MIT',
      licenseUrl: 'https://example.org/license',
      maintainer: 'Tester',
      category: 'ADS',
      enabled: true,
      trusted: true,
      updatePolicy: 'weekly',
      description: 'Test list',
    };

    expect(() => registry.registerSource(invalidIdSource)).toThrow(/Invalid source ID/);
  });

  it('rejects source with insecure HTTP URL', () => {
    const insecureSource: FilterSource = {
      id: 'insecure-list',
      name: 'Insecure HTTP List',
      url: 'http://unencrypted.example.org/list.txt',
      format: 'adblock',
      license: 'MIT',
      licenseUrl: 'https://example.org/license',
      maintainer: 'Tester',
      category: 'ADS',
      enabled: true,
      trusted: false,
      updatePolicy: 'weekly',
      description: 'Insecure list',
    };

    expect(() => registry.registerSource(insecureSource)).toThrow(/must use HTTPS/);
  });

  it('rejects source with missing license', () => {
    const noLicenseSource: FilterSource = {
      id: 'unlicensed-list',
      name: 'Unlicensed List',
      url: 'https://example.org/list.txt',
      format: 'adblock',
      license: '',
      licenseUrl: '',
      maintainer: 'Tester',
      category: 'ADS',
      enabled: true,
      trusted: false,
      updatePolicy: 'weekly',
      description: 'Unlicensed list',
    };

    expect(() => registry.registerSource(noLicenseSource)).toThrow(/missing required license/);
  });

  it('filters sources by category correctly', () => {
    const adSources = registry.getSourcesByCategory('ADS');
    expect(adSources.length).toBeGreaterThan(0);
    expect(adSources.every((s) => s.category === 'ADS')).toBe(true);

    const trackerSources = registry.getSourcesByCategory('TRACKERS');
    expect(trackerSources.length).toBeGreaterThan(0);
    expect(trackerSources.every((s) => s.category === 'TRACKERS')).toBe(true);
  });

  it('updates and removes sources safely', () => {
    registry.updateSource('peter-lowe', { enabled: false });
    expect(registry.getSource('peter-lowe')?.enabled).toBe(false);

    const removed = registry.removeSource('peter-lowe');
    expect(removed).toBe(true);
    expect(registry.getSource('peter-lowe')).toBeUndefined();
  });
});
