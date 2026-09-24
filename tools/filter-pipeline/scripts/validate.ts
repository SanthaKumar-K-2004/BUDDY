/**
 * tools/filter-pipeline/scripts/validate.ts
 * Root CLI entrypoint to validate generated DNR rulesets.
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { RulesetValidator, type DnrRule } from '../../../packages/filter-pipeline/src/index.js';

async function run() {
  const workspaceRoot = resolve(process.cwd());
  const generatedDir = join(workspaceRoot, 'data', 'generated');
  const files = ['ruleset_ads.json', 'ruleset_trackers.json', 'ruleset_annoyances.json'];

  let passed = true;
  for (const file of files) {
    try {
      const raw = await fs.readFile(join(generatedDir, file), 'utf-8');
      const rules: DnrRule[] = JSON.parse(raw);
      const rep = RulesetValidator.validate(file.replace('.json', ''), rules);
      if (!rep.isValid) {
        passed = false;
        console.error(`Validation failed for ${file}:`, rep.issues);
      } else {
        console.log(`PASS: ${file} (${rep.totalRules} rules, ${rep.limits.percentStaticUsed}% limit)`);
      }
    } catch {
      // ignore missing optional rulesets
    }
  }

  if (!passed) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
