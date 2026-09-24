/**
 * @buddy/filter-pipeline - metadata/manifest-generator.ts
 * Generates filter-manifest.json and filter-licenses.json with complete traceability,
 * cryptographic checksums, and license quarantine metadata.
 */

import type { FilterSource, SourceValidationStats } from '../sources/types.js';
import type { RulesetValidationReport } from '../validator/validator.js';

export interface ArtifactManifestEntry {
  name: string;
  path: string;
  rulesetId: string;
  contentHash: string; // SHA-256
  sizeBytes: number;
  ruleCount: number;
  safeRules: number;
  unsafeRules: number;
  regexRules: number;
  isValid: boolean;
}

export interface SourceManifestEntry {
  id: string;
  name: string;
  category: string;
  url: string;
  contentHash?: string;
  totalLines: number;
  validRules: number;
  invalidRules: number;
  ignoredRules: number;
}

export interface FilterManifest {
  pipelineVersion: string;
  schemaVersion: number;
  generatedAt: string;
  sources: SourceManifestEntry[];
  artifacts: ArtifactManifestEntry[];
  toolchain: {
    node: string;
    agtreeVersion: string;
    dnrConverterVersion: string;
  };
}

export interface FilterLicenseEntry {
  name: string;
  version?: string;
  license: string;
  licenseUrl: string;
  maintainer: string;
  source: string;
  category?: string;
  runtime: boolean;
  buildTime: boolean;
  notes?: string;
}

export class ManifestGenerator {
  public static generateManifest(
    sources: Array<{ source: FilterSource; stats: SourceValidationStats; hash?: string }>,
    artifacts: Array<{ filename: string; relPath: string; report: RulesetValidationReport; hash: string; sizeBytes: number }>,
    options: { fixedTimestamp?: string } = {}
  ): FilterManifest {
    const sourceEntries: SourceManifestEntry[] = sources.map((s) => ({
      id: s.source.id,
      name: s.source.name,
      category: s.source.category,
      url: s.source.url,
      contentHash: s.hash,
      totalLines: s.stats.totalLines,
      validRules: s.stats.validRules,
      invalidRules: s.stats.errorRules,
      ignoredRules: s.stats.ignoredRules,
    }));

    const artifactEntries: ArtifactManifestEntry[] = artifacts.map((a) => ({
      name: a.filename,
      path: a.relPath,
      rulesetId: a.report.rulesetId,
      contentHash: a.hash,
      sizeBytes: a.sizeBytes,
      ruleCount: a.report.totalRules,
      safeRules: a.report.safeRules,
      unsafeRules: a.report.unsafeRules,
      regexRules: a.report.regexRules,
      isValid: a.report.isValid,
    }));

    return {
      pipelineVersion: '1.0.0',
      schemaVersion: 1,
      generatedAt: options.fixedTimestamp || new Date().toISOString(),
      sources: sourceEntries,
      artifacts: artifactEntries,
      toolchain: {
        node: process.version,
        agtreeVersion: '^4.2.1',
        dnrConverterVersion: '^1.1.2',
      },
    };
  }

  public static generateLicenseManifest(sources: FilterSource[]): FilterLicenseEntry[] {
    const entries: FilterLicenseEntry[] = [];

    // 1. Build Tools (Quarantined)
    entries.push({
      name: '@adguard/dnr-converter',
      version: '1.1.2',
      license: 'GPL-3.0-only',
      licenseUrl: 'https://github.com/AdguardTeam/tsurlfilter/blob/master/packages/dnr-converter/LICENSE',
      maintainer: 'Adguard Software Ltd.',
      source: 'https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/dnr-converter',
      runtime: false,
      buildTime: true,
      notes: 'Quarantined in @buddy/filter-pipeline. Never packaged into runtime extension bundle.',
    });

    entries.push({
      name: '@adguard/agtree',
      version: '4.2.1',
      license: 'MIT',
      licenseUrl: 'https://github.com/AdguardTeam/tsurlfilter/blob/master/packages/agtree/LICENSE',
      maintainer: 'Adguard Software Ltd.',
      source: 'https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree',
      runtime: false,
      buildTime: true,
      notes: 'Adblock syntax parser AST library.',
    });

    // 2. Upstream Filter Sources
    for (const s of sources) {
      entries.push({
        name: s.name,
        license: s.license,
        licenseUrl: s.licenseUrl,
        maintainer: s.maintainer,
        source: s.url,
        category: s.category,
        runtime: false,
        buildTime: true,
        notes: 'Upstream rule definitions. Compiled into browser-native declarative Net Request JSON rulesets.',
      });
    }

    return entries;
  }
}
