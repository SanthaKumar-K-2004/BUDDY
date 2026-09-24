/**
 * @buddy/filter-pipeline - cache/cache-manager.ts
 * Local content-addressed cache for downloaded filter lists.
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export interface CacheMetadata {
  sourceId: string;
  url: string;
  contentHash: string; // SHA-256
  sizeBytes: number;
  lastFetchedAt: number;
  etag?: string;
  lastModified?: string;
}

export interface CacheValidationEntry {
  sourceId: string;
  isValid: boolean;
  expectedHash: string;
  actualHash?: string;
  expectedSize: number;
  actualSize?: number;
  error?: string;
}

export interface CacheValidationReport {
  timestamp: number;
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  entries: CacheValidationEntry[];
}

export class CacheManager {
  constructor(private readonly cacheDir: string) {}

  public async init(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  public getFilePath(sourceId: string): string {
    return join(this.cacheDir, `${sourceId}.txt`);
  }

  public getMetaPath(sourceId: string): string {
    return join(this.cacheDir, `${sourceId}.meta.json`);
  }

  public async has(sourceId: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(sourceId));
      await fs.access(this.getMetaPath(sourceId));
      return true;
    } catch {
      return false;
    }
  }

  public async get(sourceId: string): Promise<{ content: string; meta: CacheMetadata } | null> {
    try {
      const filePath = this.getFilePath(sourceId);
      const metaPath = this.getMetaPath(sourceId);

      const [content, metaJson] = await Promise.all([
        fs.readFile(filePath, 'utf-8'),
        fs.readFile(metaPath, 'utf-8'),
      ]);

      const meta: CacheMetadata = JSON.parse(metaJson);

      // Verify integrity against stored hash
      const actualHash = createHash('sha256').update(content, 'utf-8').digest('hex');
      if (actualHash !== meta.contentHash) {
        throw new Error(`Cache integrity failure for '${sourceId}': Hash mismatch (${actualHash} vs ${meta.contentHash})`);
      }

      return { content, meta };
    } catch {
      return null;
    }
  }

  public async save(
    sourceId: string,
    url: string,
    content: string,
    options: { etag?: string; lastModified?: string; lastFetchedAt?: number } = {}
  ): Promise<CacheMetadata> {
    await this.init();

    const sizeBytes = Buffer.byteLength(content, 'utf-8');
    const contentHash = createHash('sha256').update(content, 'utf-8').digest('hex');

    const meta: CacheMetadata = {
      sourceId,
      url,
      contentHash,
      sizeBytes,
      lastFetchedAt: options.lastFetchedAt ?? Date.now(),
      etag: options.etag,
      lastModified: options.lastModified,
    };

    const filePath = this.getFilePath(sourceId);
    const metaPath = this.getMetaPath(sourceId);

    // Atomic write
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    const tempMeta = `${metaPath}.tmp.${Date.now()}`;

    await fs.writeFile(tempFile, content, 'utf-8');
    await fs.writeFile(tempMeta, JSON.stringify(meta, null, 2), 'utf-8');

    await fs.rename(tempFile, filePath);
    await fs.rename(tempMeta, metaPath);

    return meta;
  }

  public async validateCache(): Promise<CacheValidationReport> {
    await this.init();
    const files = await fs.readdir(this.cacheDir);
    const metaFiles = files.filter((f) => f.endsWith('.meta.json'));

    const entries: CacheValidationEntry[] = [];
    let validCount = 0;

    for (const metaFile of metaFiles) {
      const sourceId = metaFile.replace('.meta.json', '');
      const metaPath = join(this.cacheDir, metaFile);
      const dataPath = join(this.cacheDir, `${sourceId}.txt`);

      try {
        const metaRaw = await fs.readFile(metaPath, 'utf-8');
        const meta: CacheMetadata = JSON.parse(metaRaw);

        const dataContent = await fs.readFile(dataPath, 'utf-8');
        const actualSize = Buffer.byteLength(dataContent, 'utf-8');
        const actualHash = createHash('sha256').update(dataContent, 'utf-8').digest('hex');

        const isValid = actualHash === meta.contentHash && actualSize === meta.sizeBytes;
        if (isValid) {
          validCount++;
        }

        entries.push({
          sourceId,
          isValid,
          expectedHash: meta.contentHash,
          actualHash,
          expectedSize: meta.sizeBytes,
          actualSize,
          error: isValid ? undefined : 'Hash or size mismatch',
        });
      } catch (err: any) {
        entries.push({
          sourceId,
          isValid: false,
          expectedHash: 'unknown',
          expectedSize: 0,
          error: err?.message || 'Failed reading cache entry',
        });
      }
    }

    return {
      timestamp: Date.now(),
      totalEntries: metaFiles.length,
      validEntries: validCount,
      invalidEntries: metaFiles.length - validCount,
      entries,
    };
  }

  public async clear(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
