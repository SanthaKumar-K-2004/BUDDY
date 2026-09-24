/**
 * @buddy/filter-pipeline - cli/build.ts
 * Builds filter rulesets locally and deterministically.
 */

import { resolve } from 'node:path';
import { FilterPipeline } from '../pipeline.js';

async function main() {
  const workspaceRoot = resolve(process.cwd(), '../..');
  console.log('🚀 Starting Buddy Shield Filter Build...');
  console.log(`📂 Workspace Root: ${workspaceRoot}`);

  const pipeline = new FilterPipeline({
    workspaceRoot,
    offlineMode: true, // Hermetic local build from cache/fixtures
  });

  const result = await pipeline.run();

  if (!result.success) {
    console.error('❌ Filter pipeline build failed with errors:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('✅ Filter pipeline build completed successfully!');
  console.log(`📊 Sources processed: ${result.sourcesProcessed}`);
  console.log(`📦 Rulesets generated: ${result.rulesetsGenerated}`);
  console.log(`🛡️  Total DNR rules: ${result.totalDnrRules}`);
  for (const rep of result.reports) {
    console.log(
      `   • ${rep.rulesetId}: ${rep.totalRules} rules (${rep.limits.percentStaticUsed}% of limit), regex: ${rep.regexRules}, status: ${rep.isValid ? 'VALID' : 'INVALID'}`
    );
  }
}

main().catch((err) => {
  console.error('💥 Fatal error running filter build:', err);
  process.exit(1);
});
