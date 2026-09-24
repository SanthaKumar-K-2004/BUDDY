/**
 * @buddy/filter-pipeline - pipeline.ts
 * Master Filter Ingestion and DNR Compilation Pipeline orchestrating
 * registry, downloader, cache, normalizer, parser, converter, deduplicator,
 * validator, manifest generator, and artifact packager.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { FilterSourceRegistry } from './sources/registry.js';
import type { FilterCategory, FilterSource, SourceValidationStats } from './sources/types.js';
import { Downloader } from './downloader/downloader.js';
import { CacheManager } from './cache/cache-manager.js';
import { FilterNormalizer } from './normalizer/normalizer.js';
import { FilterParser, type ParsedFilterResult } from './parser/parser.js';
import { DnrConverter, type DnrRule } from './converter/dnr-converter.js';
import { RuleDeduplicator } from './deduplicator/deduplicator.js';
import { RulesetValidator, type RulesetValidationReport } from './validator/validator.js';
import { ManifestGenerator } from './metadata/manifest-generator.js';
import { ReportGenerator } from './metadata/report-generator.js';
import { ArtifactPackager } from './artifacts/packager.js';

export interface PipelineConfig {
  workspaceRoot: string;
  cacheDir?: string;
  generatedDir?: string;
  shieldPublicDir?: string;
  docsDir?: string;
  fixturesDir?: string;
  offlineMode?: boolean;
  fixedTimestamp?: string;
  downloaderTimeoutMs?: number;
}

export interface PipelineRunResult {
  success: boolean;
  timestamp: string;
  sourcesProcessed: number;
  rulesetsGenerated: number;
  totalDnrRules: number;
  reports: RulesetValidationReport[];
  sourceStats: SourceValidationStats[];
  errors: string[];
}

export class FilterPipeline {
  private registry: FilterSourceRegistry;
  private downloader: Downloader;
  private cache: CacheManager;
  private config: Required<PipelineConfig>;

  constructor(config: PipelineConfig) {
    const root = config.workspaceRoot;
    this.config = {
      workspaceRoot: root,
      cacheDir: config.cacheDir || join(root, 'data', 'filters'),
      generatedDir: config.generatedDir || join(root, 'data', 'generated'),
      shieldPublicDir: config.shieldPublicDir || join(root, 'apps', 'buddy-shield', 'public'),
      docsDir: config.docsDir || join(root, 'docs', 'filters'),
      fixturesDir: config.fixturesDir || join(root, 'tests', 'fixtures'),
      offlineMode: config.offlineMode ?? false,
      fixedTimestamp: config.fixedTimestamp || '',
      downloaderTimeoutMs: config.downloaderTimeoutMs || 15000,
    };

    this.registry = new FilterSourceRegistry();
    this.downloader = new Downloader({
      timeoutMs: this.config.downloaderTimeoutMs,
      allowFileScheme: true, // allow file:// for local test fixtures
    });
    this.cache = new CacheManager(this.config.cacheDir);
  }

  public getRegistry(): FilterSourceRegistry {
    return this.registry;
  }

  /**
   * Executes the complete filter ingestion, conversion, validation, and packaging pipeline.
   */
  public async run(): Promise<PipelineRunResult> {
    const errors: string[] = [];
    const enabledSources = this.registry.getEnabledSources();

    await fs.mkdir(this.config.generatedDir, { recursive: true });
    await fs.mkdir(this.config.docsDir, { recursive: true });

    // Group rules by target ruleset category:
    // ADS -> ruleset_ads
    // TRACKERS / PRIVACY -> ruleset_trackers
    // ANNOYANCES / SOCIAL -> ruleset_annoyances
    const categoryRulesets: Record<string, { rulesetId: string; filename: string; rules: DnrRule[]; rawContents: string[] }> = {
      ADS: { rulesetId: 'ruleset_ads', filename: 'ruleset_ads.json', rules: [], rawContents: [] },
      TRACKERS: { rulesetId: 'ruleset_trackers', filename: 'ruleset_trackers.json', rules: [], rawContents: [] },
      ANNOYANCES: { rulesetId: 'ruleset_annoyances', filename: 'ruleset_annoyances.json', rules: [], rawContents: [] },
    };

    const sourceStatsList: SourceValidationStats[] = [];
    const manifestSources: Array<{ source: FilterSource; stats: SourceValidationStats; hash?: string }> = [];

    // Process each source
    for (const source of enabledSources) {
      try {
        let rawContent = '';
        let contentHash = '';

        if (this.config.offlineMode) {
          // Check local cache first, then fixtures
          const cached = await this.cache.get(source.id);
          if (cached) {
            rawContent = cached.content;
            contentHash = cached.meta.contentHash;
          } else {
            const fixturePath = join(this.config.fixturesDir, `${source.id}.txt`);
            try {
              rawContent = await fs.readFile(fixturePath, 'utf-8');
              const dlResult = await this.cache.save(source.id, source.url, rawContent);
              contentHash = dlResult.contentHash;
            } catch {
              throw new Error(`Offline mode: Missing cached list and fixture for source '${source.id}'`);
            }
          }
        } else {
          // Live fetch with fallback to cache
          try {
            const dl = await this.downloader.download(source.id, source.url);
            rawContent = dl.content;
            contentHash = dl.contentHash;
            await this.cache.save(source.id, source.url, rawContent, {
              etag: dl.etag,
              lastModified: dl.lastModified,
            });
          } catch (netErr: any) {
            // Check if we have a valid cached copy to preserve resilience
            const cached = await this.cache.get(source.id);
            if (cached) {
              rawContent = cached.content;
              contentHash = cached.meta.contentHash;
            } else {
              throw new Error(`Failed downloading required source '${source.id}': ${netErr?.message}`);
            }
          }
        }

        // 1. Normalize
        const normalized = FilterNormalizer.normalize(rawContent);

        // 2. Parse & Validate syntax
        const parsed: ParsedFilterResult = FilterParser.parse(source.id, normalized.lines);
        sourceStatsList.push(parsed.stats);
        manifestSources.push({
          source,
          stats: parsed.stats,
          hash: contentHash,
        });

        // 3. Convert to DNR
        const targetCategory = this.mapCategoryToRulesetKey(source.category);
        const conversionResult = await DnrConverter.convertList(targetCategory, normalized.normalizedContent);

        // Accumulate into target category
        if (categoryRulesets[targetCategory]) {
          categoryRulesets[targetCategory].rules.push(...conversionResult.rules);
          categoryRulesets[targetCategory].rawContents.push(normalized.normalizedContent);
        }
      } catch (srcErr: any) {
        errors.push(`Source '${source.id}' failure: ${srcErr?.message}`);
      }
    }

    if (errors.length > 0 && manifestSources.length === 0) {
      return {
        success: false,
        timestamp: this.config.fixedTimestamp || new Date().toISOString(),
        sourcesProcessed: 0,
        rulesetsGenerated: 0,
        totalDnrRules: 0,
        reports: [],
        sourceStats: [],
        errors,
      };
    }

    // Process each target ruleset
    const validationReports: RulesetValidationReport[] = [];
    const manifestArtifacts: Array<{
      filename: string;
      relPath: string;
      report: RulesetValidationReport;
      hash: string;
      sizeBytes: number;
    }> = [];

    let baseIdOffset = 1;
    let totalDnrRules = 0;

    for (const [_catKey, bucket] of Object.entries(categoryRulesets)) {
      if (bucket.rules.length === 0) {
        continue;
      }

      // 4. Semantic Deduplication & Stable ID assignment
      const dedupResult = RuleDeduplicator.deduplicate(bucket.rules, baseIdOffset);
      baseIdOffset += dedupResult.rules.length;
      totalDnrRules += dedupResult.rules.length;

      // 5. Validation against Chromium & Firefox MV3 limits
      const report = RulesetValidator.validate(bucket.rulesetId, dedupResult.rules);
      validationReports.push(report);

      if (!report.isValid) {
        errors.push(`Validation failure in '${bucket.rulesetId}': ${report.issues.map((i) => i.message).join('; ')}`);
      }

      // 6. Artifact packaging
      const targetFilePath = join(this.config.generatedDir, bucket.filename);
      const packaged = await ArtifactPackager.writeRuleset(targetFilePath, dedupResult.rules);

      manifestArtifacts.push({
        filename: bucket.filename,
        relPath: `rulesets/${bucket.filename}`,
        report,
        hash: packaged.contentHash,
        sizeBytes: packaged.sizeBytes,
      });
    }

    // Synchronize to Buddy Shield public folder
    await ArtifactPackager.syncToBuddyShield(this.config.generatedDir, this.config.shieldPublicDir);

    // 7. Generate Manifests & Coverage Report
    const manifest = ManifestGenerator.generateManifest(manifestSources, manifestArtifacts, {
      fixedTimestamp: this.config.fixedTimestamp,
    });
    await ArtifactPackager.writeJson(join(this.config.generatedDir, 'filter-manifest.json'), manifest);

    const licenseManifest = ManifestGenerator.generateLicenseManifest(this.registry.getAllSources());
    await ArtifactPackager.writeJson(join(this.config.generatedDir, 'filter-licenses.json'), licenseManifest);

    const reportData = ReportGenerator.generateReportData(manifestSources, validationReports, {
      fixedTimestamp: this.config.fixedTimestamp,
    });
    await ArtifactPackager.writeJson(join(this.config.generatedDir, 'filter-report.json'), reportData);

    const markdownReport = ReportGenerator.generateMarkdown(reportData);
    await fs.writeFile(join(this.config.docsDir, 'FILTER-COVERAGE.md'), markdownReport, 'utf-8');

    const success = errors.length === 0 && validationReports.every((r) => r.isValid);

    return {
      success,
      timestamp: manifest.generatedAt,
      sourcesProcessed: manifestSources.length,
      rulesetsGenerated: validationReports.length,
      totalDnrRules,
      reports: validationReports,
      sourceStats: sourceStatsList,
      errors,
    };
  }

  private mapCategoryToRulesetKey(category: FilterCategory): string {
    switch (category) {
      case 'ADS':
        return 'ADS';
      case 'TRACKERS':
      case 'PRIVACY':
      case 'MALWARE':
        return 'TRACKERS';
      case 'ANNOYANCES':
      case 'SOCIAL':
        return 'ANNOYANCES';
      default:
        return 'ADS';
    }
  }
}
