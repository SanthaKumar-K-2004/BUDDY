/**
 * @buddy/filter-pipeline - downloader/downloader.ts
 * Robust, secure HTTPS downloader with retry, exponential backoff, SSRF prevention,
 * size constraints, and atomic write operations.
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

export interface DownloaderOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  allowFileScheme?: boolean;
  userAgent?: string;
}

export interface DownloadResult {
  sourceId: string;
  url: string;
  content: string;
  sizeBytes: number;
  contentHash: string; // SHA-256
  etag?: string;
  lastModified?: string;
  contentType?: string;
  fetchedAt: number;
}

export class DownloadError extends Error {
  constructor(
    message: string,
    public readonly sourceId: string,
    public readonly url: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

export class Downloader {
  public static readonly DEFAULT_TIMEOUT_MS = 15000;
  public static readonly DEFAULT_MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
  public static readonly DEFAULT_MAX_RETRIES = 3;
  public static readonly DEFAULT_RETRY_DELAY_MS = 500;
  public static readonly DEFAULT_USER_AGENT = 'BuddyFilterIngest/1.0 (+https://github.com/buddyextension/buddy)';

  private timeoutMs: number;
  private maxSizeBytes: number;
  private maxRetries: number;
  private retryDelayMs: number;
  private allowFileScheme: boolean;
  private userAgent: string;

  constructor(options: DownloaderOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? Downloader.DEFAULT_TIMEOUT_MS;
    this.maxSizeBytes = options.maxSizeBytes ?? Downloader.DEFAULT_MAX_SIZE_BYTES;
    this.maxRetries = options.maxRetries ?? Downloader.DEFAULT_MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs ?? Downloader.DEFAULT_RETRY_DELAY_MS;
    this.allowFileScheme = options.allowFileScheme ?? false;
    this.userAgent = options.userAgent ?? Downloader.DEFAULT_USER_AGENT;
  }

  public async download(sourceId: string, url: string): Promise<DownloadResult> {
    this.validateUrlSecurity(url);

    if (url.startsWith('file://')) {
      return this.readLocalFile(sourceId, url);
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      attempt++;
      try {
        return await this.fetchWithTimeout(sourceId, url);
      } catch (err: any) {
        lastError = err;
        const isRetryable = err instanceof DownloadError ? err.isRetryable : true;
        if (!isRetryable || attempt >= this.maxRetries) {
          break;
        }
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new DownloadError(`Download failed for '${sourceId}' after ${this.maxRetries} attempts`, sourceId, url);
  }

  public async downloadToFile(sourceId: string, url: string, targetPath: string): Promise<DownloadResult> {
    const result = await this.download(sourceId, url);

    // Atomic write via temporary file
    const dir = dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });

    const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
    try {
      await fs.writeFile(tempPath, result.content, 'utf-8');
      await fs.rename(tempPath, targetPath);
    } catch (writeErr: any) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // ignore cleanup error
      }
      throw new Error(`Failed atomic file write for '${targetPath}': ${writeErr?.message}`);
    }

    return result;
  }

  private async fetchWithTimeout(sourceId: string, url: string): Promise<DownloadResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/plain, text/x-filter-list, text/*, */*',
        },
      });

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        throw new DownloadError(
          `HTTP ${response.status} ${response.statusText} fetching '${sourceId}' from ${url}`,
          sourceId,
          url,
          response.status,
          isRetryable
        );
      }

      // Check Content-Length header if provided
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLength) && contentLength > this.maxSizeBytes) {
          throw new DownloadError(
            `Filter '${sourceId}' exceeds maximum allowed size (${contentLength} > ${this.maxSizeBytes} bytes)`,
            sourceId,
            url,
            response.status,
            false
          );
        }
      }

      const text = await response.text();
      const sizeBytes = Buffer.byteLength(text, 'utf-8');

      if (sizeBytes > this.maxSizeBytes) {
        throw new DownloadError(
          `Downloaded content for '${sourceId}' exceeds maximum allowed size (${sizeBytes} > ${this.maxSizeBytes} bytes)`,
          sourceId,
          url,
          response.status,
          false
        );
      }

      // Reject empty response
      if (text.trim().length === 0) {
        throw new DownloadError(`Received empty response for filter '${sourceId}' from ${url}`, sourceId, url, response.status, false);
      }

      // Detect HTML error pages returned with 200 OK (common captive portal / CDN error pattern)
      const trimmedStart = text.slice(0, 100).toLowerCase().trim();
      if (trimmedStart.startsWith('<!doctype html') || trimmedStart.startsWith('<html')) {
        throw new DownloadError(
          `Received HTML document instead of adblock text for '${sourceId}' from ${url}`,
          sourceId,
          url,
          response.status,
          false
        );
      }

      const contentHash = createHash('sha256').update(text, 'utf-8').digest('hex');

      return {
        sourceId,
        url,
        content: text,
        sizeBytes,
        contentHash,
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
        contentType: response.headers.get('content-type') || undefined,
        fetchedAt: Date.now(),
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new DownloadError(`Timeout (${this.timeoutMs}ms) exceeded downloading '${sourceId}'`, sourceId, url, undefined, true);
      }
      if (err instanceof DownloadError) {
        throw err;
      }
      throw new DownloadError(`Network failure for '${sourceId}': ${err?.message}`, sourceId, url, undefined, true);
    } finally {
      clearTimeout(timer);
    }
  }

  private async readLocalFile(sourceId: string, url: string): Promise<DownloadResult> {
    const filePath = url.replace('file://', '');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const sizeBytes = Buffer.byteLength(content, 'utf-8');
      const contentHash = createHash('sha256').update(content, 'utf-8').digest('hex');

      return {
        sourceId,
        url,
        content,
        sizeBytes,
        contentHash,
        fetchedAt: Date.now(),
      };
    } catch (err: any) {
      throw new DownloadError(`Failed reading local file for '${sourceId}': ${err?.message}`, sourceId, url, 404, false);
    }
  }

  public validateUrlSecurity(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid URL format: '${url}'`);
    }

    if (parsed.protocol === 'file:') {
      if (!this.allowFileScheme) {
        throw new Error(`Forbidden URL protocol 'file:' for production download: '${url}'`);
      }
      return;
    }

    if (parsed.protocol !== 'https:') {
      throw new Error(`Forbidden insecure protocol '${parsed.protocol}' for URL '${url}'. HTTPS is strictly required.`);
    }

    // SSRF Prevention: Reject loopback, private ranges, link-local, and cloud metadata
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      throw new Error(`SSRF blocked: Attempt to access local loopback address '${hostname}'`);
    }

    // Cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      throw new Error(`SSRF blocked: Attempt to access cloud metadata endpoint '${hostname}'`);
    }

    // Private IPv4 ranges
    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const b1 = parseInt(ipv4Match[1], 10);
      const b2 = parseInt(ipv4Match[2], 10);

      // 10.0.0.0/8
      if (b1 === 10) throw new Error(`SSRF blocked: Private IPv4 range '${hostname}'`);
      // 172.16.0.0/12
      if (b1 === 172 && b2 >= 16 && b2 <= 31) throw new Error(`SSRF blocked: Private IPv4 range '${hostname}'`);
      // 192.168.0.0/16
      if (b1 === 192 && b2 === 168) throw new Error(`SSRF blocked: Private IPv4 range '${hostname}'`);
      // 127.0.0.0/8
      if (b1 === 127) throw new Error(`SSRF blocked: Loopback IPv4 range '${hostname}'`);
      // 169.254.0.0/16
      if (b1 === 169 && b2 === 254) throw new Error(`SSRF blocked: Link-local IPv4 range '${hostname}'`);
    }
  }
}
