/**
 * tools/filter-pipeline/fetch/fetch.ts
 * Dedicated fetch utility to download a single filter list or test source.
 */

import { Downloader } from '../../../packages/filter-pipeline/src/index.js';

async function fetchSource(sourceId: string, url: string) {
  const downloader = new Downloader({ allowFileScheme: true });
  const result = await downloader.download(sourceId, url);
  console.log(`Fetched ${sourceId}: ${result.sizeBytes} bytes, SHA-256: ${result.contentHash}`);
  return result;
}

if (process.argv.length >= 4) {
  const sourceId = process.argv[2];
  const url = process.argv[3];
  fetchSource(sourceId, url).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { fetchSource };
