/**
 * tools/filter-pipeline/scripts/update.ts
 * Root CLI entrypoint to fetch fresh lists and compile filters.
 */

import { resolve } from 'node:path';
import { FilterPipeline } from '../../../packages/filter-pipeline/src/index.js';

async function run() {
  const workspaceRoot = resolve(process.cwd());
  const pipeline = new FilterPipeline({
    workspaceRoot,
    offlineMode: false,
  });

  const res = await pipeline.run();
  if (!res.success) {
    console.error('Filter update failed:', res.errors);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
