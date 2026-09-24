import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FilterPipeline, type DnrRule, type FilterManifest } from '@buddy/filter-pipeline';

describe('FilterPipeline - End-to-End System Integration', () => {
  let testWorkspace: string;
  let testCacheDir: string;
  let testGeneratedDir: string;
  let testShieldPublicDir: string;
  let testDocsDir: string;
  const projectRoot = process.cwd();
  const realFixturesDir = join(projectRoot, 'tests', 'fixtures');

  beforeEach(async () => {
    testWorkspace = join(tmpdir(), `buddy-pipeline-test-${Date.now()}`);
    testCacheDir = join(testWorkspace, 'data', 'filters');
    testGeneratedDir = join(testWorkspace, 'data', 'generated');
    testShieldPublicDir = join(testWorkspace, 'apps', 'buddy-shield', 'public');
    testDocsDir = join(testWorkspace, 'docs', 'filters');

    await fs.mkdir(testCacheDir, { recursive: true });
    await fs.mkdir(testGeneratedDir, { recursive: true });
    await fs.mkdir(testShieldPublicDir, { recursive: true });
    await fs.mkdir(testDocsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('executes full pipeline from fixtures to verified DNR artifacts and manifests', async () => {
    const pipeline = new FilterPipeline({
      workspaceRoot: testWorkspace,
      cacheDir: testCacheDir,
      generatedDir: testGeneratedDir,
      shieldPublicDir: testShieldPublicDir,
      docsDir: testDocsDir,
      fixturesDir: realFixturesDir,
      offlineMode: true,
      fixedTimestamp: '2026-09-22T12:00:00.000Z',
    });

    const result = await pipeline.run();

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sourcesProcessed).toBeGreaterThanOrEqual(4);
    expect(result.rulesetsGenerated).toBeGreaterThanOrEqual(2);
    expect(result.totalDnrRules).toBeGreaterThan(0);

    // 1. Verify ruleset_ads.json
    const adsRulesetPath = join(testGeneratedDir, 'ruleset_ads.json');
    const adsRaw = await fs.readFile(adsRulesetPath, 'utf-8');
    const adsRules: DnrRule[] = JSON.parse(adsRaw);
    expect(adsRules.length).toBeGreaterThan(0);
    expect(adsRules.every((r) => Number.isInteger(r.id) && r.id > 0)).toBe(true);

    // 2. Verify ruleset_trackers.json
    const trackersRulesetPath = join(testGeneratedDir, 'ruleset_trackers.json');
    const trackersRaw = await fs.readFile(trackersRulesetPath, 'utf-8');
    const trackersRules: DnrRule[] = JSON.parse(trackersRaw);
    expect(trackersRules.length).toBeGreaterThan(0);

    // 3. Verify filter-manifest.json
    const manifestPath = join(testGeneratedDir, 'filter-manifest.json');
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest: FilterManifest = JSON.parse(manifestRaw);
    expect(manifest.pipelineVersion).toBe('1.0.0');
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.generatedAt).toBe('2026-09-22T12:00:00.000Z');
    expect(manifest.sources.length).toBeGreaterThanOrEqual(4);
    expect(manifest.artifacts.length).toBeGreaterThanOrEqual(2);
    expect(manifest.artifacts.every((a) => a.isValid && a.contentHash.length === 64)).toBe(true);

    // 4. Verify filter-licenses.json
    const licensesPath = join(testGeneratedDir, 'filter-licenses.json');
    const licensesRaw = await fs.readFile(licensesPath, 'utf-8');
    const licenses = JSON.parse(licensesRaw);
    const dnrConverterLicense = licenses.find((l: any) => l.name === '@adguard/dnr-converter');
    expect(dnrConverterLicense).toBeDefined();
    expect(dnrConverterLicense.buildTime).toBe(true);
    expect(dnrConverterLicense.runtime).toBe(false);

    // 5. Verify synchronization to Buddy Shield public rulesets
    const shieldAdsPath = join(testShieldPublicDir, 'rulesets', 'ruleset_ads.json');
    const shieldTrackersPath = join(testShieldPublicDir, 'rulesets', 'ruleset_trackers.json');
    expect(await fs.readFile(shieldAdsPath, 'utf-8')).toBe(adsRaw);
    expect(await fs.readFile(shieldTrackersPath, 'utf-8')).toBe(trackersRaw);

    // 6. Verify FILTER-COVERAGE.md
    const coverageMdPath = join(testDocsDir, 'FILTER-COVERAGE.md');
    const coverageMd = await fs.readFile(coverageMdPath, 'utf-8');
    expect(coverageMd).toContain('# Buddy Shield — Filter Ingestion & Coverage Report');
    expect(coverageMd).toContain('ruleset_ads');
    expect(coverageMd).toContain('ruleset_trackers');
  });
});
