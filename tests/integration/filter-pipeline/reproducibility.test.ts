import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { FilterPipeline } from '@buddy/filter-pipeline';

describe('Reproducibility Gate - Bit-for-Bit Deterministic Generation', () => {
  let workspaceA: string;
  let workspaceB: string;
  const projectRoot = process.cwd();
  const realFixturesDir = join(projectRoot, 'tests', 'fixtures');

  beforeEach(async () => {
    const base = join(tmpdir(), `buddy-repro-test-${Date.now()}`);
    workspaceA = join(base, 'run-a');
    workspaceB = join(base, 'run-b');

    await fs.mkdir(workspaceA, { recursive: true });
    await fs.mkdir(workspaceB, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(dirname(workspaceA), { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  function dirname(p: string) {
    return join(p, '..');
  }

  it('proves that two independent pipeline runs produce bit-for-bit identical DNR artifacts', async () => {
    const fixedTime = '2026-09-22T00:00:00.000Z';

    // Run A
    const pipelineA = new FilterPipeline({
      workspaceRoot: workspaceA,
      fixturesDir: realFixturesDir,
      offlineMode: true,
      fixedTimestamp: fixedTime,
    });
    const resultA = await pipelineA.run();
    expect(resultA.success).toBe(true);

    // Run B
    const pipelineB = new FilterPipeline({
      workspaceRoot: workspaceB,
      fixturesDir: realFixturesDir,
      offlineMode: true,
      fixedTimestamp: fixedTime,
    });
    const resultB = await pipelineB.run();
    expect(resultB.success).toBe(true);

    // Compare ruleset_ads.json
    const adsHashA = createHash('sha256')
      .update(await fs.readFile(join(workspaceA, 'data', 'generated', 'ruleset_ads.json')))
      .digest('hex');
    const adsHashB = createHash('sha256')
      .update(await fs.readFile(join(workspaceB, 'data', 'generated', 'ruleset_ads.json')))
      .digest('hex');
    expect(adsHashA).toBe(adsHashB);

    // Compare ruleset_trackers.json
    const trackersHashA = createHash('sha256')
      .update(await fs.readFile(join(workspaceA, 'data', 'generated', 'ruleset_trackers.json')))
      .digest('hex');
    const trackersHashB = createHash('sha256')
      .update(await fs.readFile(join(workspaceB, 'data', 'generated', 'ruleset_trackers.json')))
      .digest('hex');
    expect(trackersHashA).toBe(trackersHashB);

    // Compare filter-manifest.json
    const manifestA = await fs.readFile(join(workspaceA, 'data', 'generated', 'filter-manifest.json'), 'utf-8');
    const manifestB = await fs.readFile(join(workspaceB, 'data', 'generated', 'filter-manifest.json'), 'utf-8');
    expect(manifestA).toBe(manifestB);

    // Compare filter-licenses.json
    const licensesA = await fs.readFile(join(workspaceA, 'data', 'generated', 'filter-licenses.json'), 'utf-8');
    const licensesB = await fs.readFile(join(workspaceB, 'data', 'generated', 'filter-licenses.json'), 'utf-8');
    expect(licensesA).toBe(licensesB);
  });
});
