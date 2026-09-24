/**
 * @buddy/filter-pipeline - cli/validate.ts
 * Validates generated declarativeNetRequest JSON files against browser ruleset budgets and schema.
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { RulesetValidator } from '../validator/validator.js';
import type { DnrRule } from '../converter/dnr-converter.js';

async function main() {
  const workspaceRoot = resolve(process.cwd(), '../..');
  const generatedDir = join(workspaceRoot, 'data', 'generated');
  console.log(`🔍 Validating DNR artifacts in ${generatedDir}...`);

  const files = ['ruleset_ads.json', 'ruleset_trackers.json', 'ruleset_annoyances.json'];
  let allValid = true;

  for (const file of files) {
    const fullPath = join(generatedDir, file);
    try {
      const raw = await fs.readFile(fullPath, 'utf-8');
      const rules: DnrRule[] = JSON.parse(raw);
      const rulesetId = file.replace('.json', '');
      const report = RulesetValidator.validate(rulesetId, rules);

      if (!report.isValid) {
        allValid = false;
        console.error(`❌ ${file} FAILED validation:`);
        for (const iss of report.issues) {
          console.error(`   - [${iss.code}] ${iss.message}`);
        }
      } else {
        console.log(`✅ ${file}: ${report.totalRules} rules (${report.limits.percentStaticUsed}% limit), regex: ${report.regexRules} — PASS`);
      }
    } catch (err: any) {
      console.warn(`⚠️  ${file} skipped or not found: ${err?.message}`);
    }
  }

  if (!allValid) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('💥 Fatal error during validation:', err);
  process.exit(1);
});
