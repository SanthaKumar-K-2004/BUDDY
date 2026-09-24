/**
 * @buddy/filter-pipeline - sources/registry.ts
 * Authoritative registry of vetted filter sources for Buddy Shield.
 */

import type { FilterCategory, FilterSource } from './types.js';

export const DEFAULT_FILTER_SOURCES: FilterSource[] = [
  {
    id: 'easylist',
    name: 'EasyList Standard',
    url: 'https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist_general_block.txt',
    format: 'adblock',
    license: 'GPLv3 / CC BY-SA 3.0',
    licenseUrl: 'https://easylist.to/pages/licence.html',
    maintainer: 'EasyList Community',
    category: 'ADS',
    enabled: true,
    trusted: true,
    updatePolicy: 'weekly',
    description: 'Primary open-source rule list that removes advertisements on English-language sites.',
    homepage: 'https://easylist.to/',
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy Tracking Protection',
    url: 'https://raw.githubusercontent.com/easylist/easylist/master/easyprivacy/easyprivacy_general.txt',
    format: 'adblock',
    license: 'GPLv3 / CC BY-SA 3.0',
    licenseUrl: 'https://easylist.to/pages/licence.html',
    maintainer: 'EasyList Community',
    category: 'TRACKERS',
    enabled: true,
    trusted: true,
    updatePolicy: 'weekly',
    description: 'Companion list to EasyList designed specifically to prevent user tracking.',
    homepage: 'https://easylist.to/',
  },
  {
    id: 'peter-lowe',
    name: "Peter Lowe's Ad and Tracking Server List",
    url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=0&mimetype=plaintext',
    format: 'adblock',
    license: 'CC BY 3.0',
    licenseUrl: 'https://pgl.yoyo.org/adservers/',
    maintainer: 'Peter Lowe',
    category: 'ADS',
    enabled: true,
    trusted: true,
    updatePolicy: 'weekly',
    description: 'Curated, high-accuracy list of ad and tracking server hostnames.',
    homepage: 'https://pgl.yoyo.org/adservers/',
  },
  {
    id: 'ublock-filters',
    name: 'uBlock Origin Filters',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    format: 'adblock',
    license: 'GPLv3',
    licenseUrl: 'https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE',
    maintainer: 'Raymond Hill & uAssets Team',
    category: 'ADS',
    enabled: true,
    trusted: true,
    updatePolicy: 'weekly',
    description: 'Core network filtering rules maintained by the uBlock Origin project.',
    homepage: 'https://github.com/uBlockOrigin/uAssets',
  },
  {
    id: 'ublock-privacy',
    name: 'uBlock Origin Privacy',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
    format: 'adblock',
    license: 'GPLv3',
    licenseUrl: 'https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE',
    maintainer: 'Raymond Hill & uAssets Team',
    category: 'TRACKERS',
    enabled: true,
    trusted: true,
    updatePolicy: 'weekly',
    description: 'Privacy and tracker protection rules from uBlock Origin.',
    homepage: 'https://github.com/uBlockOrigin/uAssets',
  },
  {
    id: 'ublock-annoyances',
    name: 'uBlock Origin Annoyances',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt',
    format: 'adblock',
    license: 'GPLv3',
    licenseUrl: 'https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE',
    maintainer: 'Raymond Hill & uAssets Team',
    category: 'ANNOYANCES',
    enabled: false,
    trusted: true,
    updatePolicy: 'weekly',
    description: 'Blocks cookie consent banners, newsletter popups, and non-ad web annoyances.',
    homepage: 'https://github.com/uBlockOrigin/uAssets',
  },
];

export class FilterSourceRegistry {
  private sources: Map<string, FilterSource> = new Map();

  constructor(initialSources: FilterSource[] = DEFAULT_FILTER_SOURCES) {
    for (const source of initialSources) {
      this.registerSource(source);
    }
  }

  public registerSource(source: FilterSource): void {
    this.validateSource(source);
    if (this.sources.has(source.id)) {
      throw new Error(`Duplicate filter source ID registered: '${source.id}'`);
    }
    this.sources.set(source.id, { ...source });
  }

  public getSource(id: string): FilterSource | undefined {
    const src = this.sources.get(id);
    return src ? { ...src } : undefined;
  }

  public getAllSources(): FilterSource[] {
    return Array.from(this.sources.values()).map((s) => ({ ...s }));
  }

  public getEnabledSources(): FilterSource[] {
    return this.getAllSources().filter((s) => s.enabled);
  }

  public getSourcesByCategory(category: FilterCategory): FilterSource[] {
    return this.getAllSources().filter((s) => s.category === category);
  }

  public updateSource(id: string, updates: Partial<FilterSource>): void {
    const existing = this.sources.get(id);
    if (!existing) {
      throw new Error(`Filter source not found: '${id}'`);
    }
    const updated = { ...existing, ...updates, id }; // ID cannot be mutated
    this.validateSource(updated);
    this.sources.set(id, updated);
  }

  public removeSource(id: string): boolean {
    return this.sources.delete(id);
  }

  public validateSource(source: FilterSource): void {
    if (!source.id || !/^[a-z0-9-_]+$/i.test(source.id)) {
      throw new Error(`Invalid source ID: '${source.id}'. Must be alphanumeric with hyphens/underscores.`);
    }
    if (!source.name || source.name.trim().length === 0) {
      throw new Error(`Source '${source.id}' missing required name.`);
    }
    if (!source.license || source.license.trim().length === 0) {
      throw new Error(`Source '${source.id}' missing required license.`);
    }
    if (!source.category) {
      throw new Error(`Source '${source.id}' missing required category.`);
    }
    if (!source.format) {
      throw new Error(`Source '${source.id}' missing required format.`);
    }

    try {
      const parsedUrl = new URL(source.url);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'file:') {
        throw new Error(`Source '${source.id}' URL must use HTTPS (got ${parsedUrl.protocol}).`);
      }
    } catch (err: any) {
      throw new Error(`Invalid URL for source '${source.id}': ${err?.message || source.url}`);
    }
  }
}
