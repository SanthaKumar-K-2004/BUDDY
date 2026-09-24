/**
 * @buddy/filter-pipeline - artifacts/packager.ts
 * Deterministic JSON formatting, hash generation, and artifact synchronization
 * for Buddy Shield and downstream tooling.
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DnrRule } from '../converter/dnr-converter.js';

export interface PackagedArtifact {
  name: string;
  filePath: string;
  contentHash: string; // SHA-256
  sizeBytes: number;
  ruleCount: number;
}

export class ArtifactPackager {
  /**
   * Deterministically serializes a value to formatted JSON with trailing newline.
   */
  public static serializeDeterministicJson(data: unknown): string {
    return JSON.stringify(data, ArtifactPackager.jsonKeySorter, 2) + '\n';
  }

  private static jsonKeySorter(_key: string, value: any): any {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sortedObj: Record<string, any> = {};
      const sortedKeys = Object.keys(value).sort();
      for (const k of sortedKeys) {
        sortedObj[k] = value[k];
      }
      return sortedObj;
    }
    return value;
  }

  /**
   * Writes a ruleset array to target file path atomically with deterministic formatting.
   */
  public static async writeRuleset(
    targetPath: string,
    rules: DnrRule[]
  ): Promise<PackagedArtifact> {
    const dir = dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });

    const jsonContent = ArtifactPackager.serializeDeterministicJson(rules);
    const sizeBytes = Buffer.byteLength(jsonContent, 'utf-8');
    const contentHash = createHash('sha256').update(jsonContent, 'utf-8').digest('hex');

    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, jsonContent, 'utf-8');
    await fs.rename(tempPath, targetPath);

    return {
      name: targetPath.split('/').pop() || 'ruleset.json',
      filePath: targetPath,
      contentHash,
      sizeBytes,
      ruleCount: rules.length,
    };
  }

  /**
   * Writes arbitrary deterministic JSON content to a target file atomically.
   */
  public static async writeJson(targetPath: string, data: unknown): Promise<string> {
    const dir = dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });

    const jsonContent = ArtifactPackager.serializeDeterministicJson(data);
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, jsonContent, 'utf-8');
    await fs.rename(tempPath, targetPath);

    return createHash('sha256').update(jsonContent, 'utf-8').digest('hex');
  }

  /**
   * Synchronizes compiled rulesets from data/generated/ to apps/buddy-shield/public/rulesets/.
   */
  public static async syncToBuddyShield(
    generatedDir: string,
    shieldPublicDir: string,
    rulesetFiles: string[] = ['ruleset_ads.json', 'ruleset_trackers.json', 'ruleset_annoyances.json']
  ): Promise<string[]> {
    const targetDir = join(shieldPublicDir, 'rulesets');
    await fs.mkdir(targetDir, { recursive: true });

    const synced: string[] = [];

    for (const file of rulesetFiles) {
      const srcFile = join(generatedDir, file);
      const destFile = join(targetDir, file);

      try {
        await fs.access(srcFile);
        const content = await fs.readFile(srcFile, 'utf-8');
        await fs.writeFile(destFile, content, 'utf-8');
        synced.push(destFile);
      } catch {
        // Source file may not exist if category had 0 rules
      }
    }

    return synced;
  }
}
