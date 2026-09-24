/**
 * @buddy/filter-pipeline - cli/update.ts
 * Fetches fresh upstream filter lists, validates, compiles DNR rulesets, and updates metadata.
 */

import { resolve } from 'node:path';
import { FilterPipeline } from '../pipeline.js';

async function main() {
  const workspaceRoot = resolve(process.cwd(), '../..');
  console.log('🌐 Starting Buddy Shield Filter Update (Live Fetch)...');
  console.log(`📂 Workspace Root: ${workspaceRoot}`);

  const pipeline = new FilterPipeline({
    workspaceRoot,
    offlineMode: false, // Fetch live from upstream sources
  });

  const result = await pipeline.run();

  if (!result.success) {
    console.error('❌ Filter pipeline update failed:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('✅ Filter pipeline update completed successfully!');
  console.log(`📊 Sources processed: ${result.sourcesProcessed}`);
  console.log(`📦 Rulesets generated: ${result.rulesetsGenerated}`);
  console.log(`🛡️  Total DNR rules: ${result.totalDnrRules}`);
}

main().catch((err) => {
  console.error('💥 Fatal error running filter update:', err);
  process.exit(1);
});
