/**
 * tools/filter-pipeline/scripts/build.ts
 * Root CLI entrypoint to build filters deterministically and offline.
 */

import { resolve } from 'node:path';
import { FilterPipeline } from '../../../packages/filter-pipeline/src/index.js';

async function run() {
  const workspaceRoot = resolve(process.cwd());
  const pipeline = new FilterPipeline({
    workspaceRoot,
    offlineMode: true,
  });

  const res = await pipeline.run();
  if (!res.success) {
    console.error('Filter compilation failed:', res.errors);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
