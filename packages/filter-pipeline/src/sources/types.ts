/**
 * @buddy/filter-pipeline - sources/types.ts
 * Strictly typed definitions for filter sources, categories, and rule diagnostics.
 */

export type FilterCategory =
  | 'ADS'
  | 'TRACKERS'
  | 'PRIVACY'
  | 'MALWARE'
  | 'SOCIAL'
  | 'ANNOYANCES'
  | 'REGIONAL'
  | 'GENERIC';

export type FilterFormat =
  | 'adblock'
  | 'hosts'
  | 'domains'
  | 'dnr';

export type UpdatePolicy =
  | 'weekly'
  | 'daily'
  | 'manual'
  | 'static';

export interface FilterSource {
  id: string;
  name: string;
  url: string;
  format: FilterFormat;
  license: string;
  licenseUrl: string;
  maintainer: string;
  category: FilterCategory;
  enabled: boolean;
  trusted: boolean;
  checksum?: string;
  expectedMinRules?: number;
  updatePolicy: UpdatePolicy;
  description: string;
  homepage?: string;
}

export type RuleDiagnosticSeverity = 'VALID' | 'WARNING' | 'UNSUPPORTED' | 'IGNORED' | 'ERROR';

export interface RuleDiagnostic {
  sourceId: string;
  lineNumber: number;
  rawRule: string;
  severity: RuleDiagnosticSeverity;
  message: string;
  category?: 'NETWORK' | 'COSMETIC' | 'SCRIPTLET' | 'HOSTS' | 'COMMENT' | 'METADATA' | 'UNSUPPORTED' | 'INVALID' | 'UNKNOWN';
}

export interface SourceValidationStats {
  sourceId: string;
  totalLines: number;
  validRules: number;
  warningRules: number;
  unsupportedRules: number;
  ignoredRules: number;
  errorRules: number;
  networkRules: number;
  cosmeticRules: number;
  scriptletRules: number;
  hostsRules: number;
}
