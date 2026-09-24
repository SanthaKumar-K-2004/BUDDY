/**
 * tools/filter-pipeline/convert/convert.ts
 * Standalone DNR conversion utility for adblock text files.
 */

import { promises as fs } from 'node:fs';
import { DnrConverter } from '../../../packages/filter-pipeline/src/index.js';

async function convertFile(inputPath: string, rulesetId = 'ruleset_custom') {
  const content = await fs.readFile(inputPath, 'utf-8');
  const result = await DnrConverter.convertList(rulesetId, content);
  console.log(`Converted ${result.rules.length} DNR rules (safe: ${result.safeRulesCount}, regex: ${result.regexpRulesCount})`);
  return result;
}

if (process.argv.length >= 3) {
  const file = process.argv[2];
  convertFile(file).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { convertFile };
