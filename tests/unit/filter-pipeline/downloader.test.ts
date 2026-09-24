import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Downloader, DownloadError } from '@buddy/filter-pipeline';

describe('Downloader - Security, SSRF Prevention, and Integrity', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `buddy-downloader-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('rejects unencrypted HTTP URLs in production mode', () => {
    const downloader = new Downloader({ allowFileScheme: false });
    expect(() => downloader.validateUrlSecurity('http://insecure.example.com/rules.txt')).toThrow(
      /Forbidden insecure protocol 'http:'/
    );
  });

  it('rejects file scheme when allowFileScheme is false', () => {
    const downloader = new Downloader({ allowFileScheme: false });
    expect(() => downloader.validateUrlSecurity('file:///etc/passwd')).toThrow(
      /Forbidden URL protocol 'file:'/
    );
  });

  it('blocks SSRF attempts to localhost and loopback addresses', () => {
    const downloader = new Downloader();
    expect(() => downloader.validateUrlSecurity('https://localhost/secret')).toThrow(/SSRF blocked/);
    expect(() => downloader.validateUrlSecurity('https://127.0.0.1:8080/data')).toThrow(/SSRF blocked/);
    expect(() => downloader.validateUrlSecurity('https://127.0.0.5/api')).toThrow(/SSRF blocked/);
    expect(() => downloader.validateUrlSecurity('https://0.0.0.0/test')).toThrow(/SSRF blocked/);
  });

  it('blocks SSRF attempts to cloud metadata endpoints', () => {
    const downloader = new Downloader();
    expect(() => downloader.validateUrlSecurity('https://169.254.169.254/latest/meta-data/')).toThrow(
      /SSRF blocked: Attempt to access cloud metadata endpoint/
    );
    expect(() => downloader.validateUrlSecurity('https://metadata.google.internal/computeMetadata/v1/')).toThrow(
      /SSRF blocked: Attempt to access cloud metadata endpoint/
    );
  });

  it('blocks SSRF attempts to private IPv4 network ranges', () => {
    const downloader = new Downloader();
    expect(() => downloader.validateUrlSecurity('https://10.0.1.5/admin')).toThrow(/Private IPv4 range/);
    expect(() => downloader.validateUrlSecurity('https://192.168.1.1/config')).toThrow(/Private IPv4 range/);
    expect(() => downloader.validateUrlSecurity('https://172.16.0.1/internal')).toThrow(/Private IPv4 range/);
    expect(() => downloader.validateUrlSecurity('https://172.31.255.255/internal')).toThrow(/Private IPv4 range/);
  });

  it('permits valid public HTTPS URLs', () => {
    const downloader = new Downloader();
    expect(() => downloader.validateUrlSecurity('https://raw.githubusercontent.com/easylist/easylist/master/easylist.txt')).not.toThrow();
    expect(() => downloader.validateUrlSecurity('https://pgl.yoyo.org/adservers/serverlist.php')).not.toThrow();
  });

  it('reads local file fixture safely when file scheme is allowed', async () => {
    const fixtureContent = '||sample-ad.com^\n||tracker.org^$third-party\n';
    const fixturePath = join(testDir, 'sample-fixture.txt');
    await fs.writeFile(fixturePath, fixtureContent, 'utf-8');

    const downloader = new Downloader({ allowFileScheme: true });
    const result = await downloader.download('test-source', `file://${fixturePath}`);

    expect(result.sourceId).toBe('test-source');
    expect(result.content).toBe(fixtureContent);
    expect(result.sizeBytes).toBe(Buffer.byteLength(fixtureContent, 'utf-8'));
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/); // Valid SHA-256
  });

  it('writes downloaded file atomically without leaving temporary files', async () => {
    const fixtureContent = '||banner.adnetwork.com^\n';
    const fixturePath = join(testDir, 'source-fixture.txt');
    const targetPath = join(testDir, 'downloaded-output.txt');
    await fs.writeFile(fixturePath, fixtureContent, 'utf-8');

    const downloader = new Downloader({ allowFileScheme: true });
    const result = await downloader.downloadToFile('test-source', `file://${fixturePath}`, targetPath);

    expect(result.sizeBytes).toBe(Buffer.byteLength(fixtureContent, 'utf-8'));
    const written = await fs.readFile(targetPath, 'utf-8');
    expect(written).toBe(fixtureContent);

    // Verify no .tmp files left over
    const files = await fs.readdir(testDir);
    expect(files.filter((f) => f.includes('.tmp'))).toHaveLength(0);
  });
});
