/**
 * tools/filter-pipeline/validate/validate.ts
 * Standalone DNR ruleset validator utility for arbitrary JSON rulesets.
 */

import { promises as fs } from 'node:fs';
import { RulesetValidator, type DnrRule } from '../../../packages/filter-pipeline/src/index.js';

async function validateRulesetFile(filePath: string, rulesetId = 'custom') {
  const content = await fs.readFile(filePath, 'utf-8');
  const rules: DnrRule[] = JSON.parse(content);
  const report = RulesetValidator.validate(rulesetId, rules);

  if (!report.isValid) {
    console.error(`Validation failed with ${report.issues.length} issues:`, report.issues);
    return false;
  }

  console.log(`Validation PASSED: ${report.totalRules} rules, ${report.limits.percentStaticUsed}% static budget used`);
  return true;
}

if (process.argv.length >= 3) {
  const file = process.argv[2];
  validateRulesetFile(file).then((ok) => {
    if (!ok) process.exit(1);
  });
}

export { validateRulesetFile };
