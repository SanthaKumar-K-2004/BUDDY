/**
 * @buddy/filter-pipeline - parser/parser.ts
 * Adblock filter syntax parser utilizing @adguard/agtree AST.
 * Categorizes rules, extracts network directives, validates syntax, and collects diagnostics.
 */

import { RuleParser } from '@adguard/agtree';
import type { RuleDiagnostic, SourceValidationStats } from '../sources/types.js';

export type ParsedRuleKind =
  | 'NETWORK_BLOCK'
  | 'NETWORK_ALLOW'
  | 'COSMETIC_HIDE'
  | 'SCRIPTLET'
  | 'HOSTS'
  | 'COMMENT'
  | 'METADATA'
  | 'UNSUPPORTED'
  | 'INVALID';

export interface ParsedNetworkRule {
  raw: string;
  lineNumber: number;
  isException: boolean; // true if @@ (allow)
  pattern: string;
  modifiers?: Array<{ name: string; value?: string; isException?: boolean }>;
  domains?: string[];
  excludedDomains?: string[];
  resourceTypes?: string[];
  thirdParty?: boolean;
}

export interface ParsedCosmeticRule {
  raw: string;
  lineNumber: number;
  selector: string;
  domains?: string[];
  excludedDomains?: string[];
}

export interface ParsedScriptletRule {
  raw: string;
  lineNumber: number;
  scriptletName: string;
  args: string[];
  domains?: string[];
}

export interface ParsedHostsRule {
  raw: string;
  lineNumber: number;
  ip: string;
  domain: string;
}

export interface ParsedFilterResult {
  sourceId: string;
  networkRules: ParsedNetworkRule[];
  cosmeticRules: ParsedCosmeticRule[];
  scriptletRules: ParsedScriptletRule[];
  hostsRules: ParsedHostsRule[];
  diagnostics: RuleDiagnostic[];
  stats: SourceValidationStats;
}

export class FilterParser {
  /**
   * Parses normalized filter lines into structured categories and validates syntax.
   */
  public static parse(sourceId: string, lines: string[]): ParsedFilterResult {
    const networkRules: ParsedNetworkRule[] = [];
    const cosmeticRules: ParsedCosmeticRule[] = [];
    const scriptletRules: ParsedScriptletRule[] = [];
    const hostsRules: ParsedHostsRule[] = [];
    const diagnostics: RuleDiagnostic[] = [];

    const stats: SourceValidationStats = {
      sourceId,
      totalLines: lines.length,
      validRules: 0,
      warningRules: 0,
      unsupportedRules: 0,
      ignoredRules: 0,
      errorRules: 0,
      networkRules: 0,
      cosmeticRules: 0,
      scriptletRules: 0,
      hostsRules: 0,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      if (!line) {
        stats.ignoredRules++;
        continue;
      }

      // 1. Comments and Metadata (excluding cosmetic rule prefixes like ##, #@#, #?#, #%#)
      const isComment = line.startsWith('!') || (line.startsWith('#') && !line.startsWith('##') && !line.startsWith('#@#') && !line.startsWith('#?#') && !line.startsWith('#%#'));
      if (isComment) {
        stats.ignoredRules++;
        diagnostics.push({
          sourceId,
          lineNumber,
          rawRule: line,
          severity: 'IGNORED',
          message: 'Comment or metadata directive',
          category: 'COMMENT',
        });
        continue;
      }

      // 2. Hosts format (e.g. 127.0.0.1 ad.example.com or 0.0.0.0 ad.example.com)
      const hostsMatch = line.match(/^(127\.0\.0\.1|0\.0\.0\.0)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
      if (hostsMatch) {
        const ip = hostsMatch[1];
        const domain = hostsMatch[2].toLowerCase();
        hostsRules.push({ raw: line, lineNumber, ip, domain });
        stats.validRules++;
        stats.hostsRules++;
        // Also synthesize a network rule for hosts entry: ||domain^
        networkRules.push({
          raw: `||${domain}^`,
          lineNumber,
          isException: false,
          pattern: `||${domain}^`,
        });
        stats.networkRules++;
        continue;
      }

      // 3. Adblock rule parsing via AGTree AST
      try {
        const ast = RuleParser.parse(line);
        if (!ast) {
          stats.warningRules++;
          diagnostics.push({
            sourceId,
            lineNumber,
            rawRule: line,
            severity: 'WARNING',
            message: 'Unrecognized rule format',
            category: 'UNKNOWN',
          });
          continue;
        }

        switch (ast.type) {
          case 'NetworkRule': {
            const parsedNetwork = FilterParser.extractNetworkRule(ast, line, lineNumber);
            networkRules.push(parsedNetwork);
            stats.validRules++;
            stats.networkRules++;
            break;
          }

          case 'ElementHidingRule':
          case 'CssInjectionRule':
          case 'ScriptletInjectionRule':
          case 'HtmlFilteringRule':
          case 'JsInjectionRule': {
            const parsedCosmetic = FilterParser.extractCosmeticRule(ast, line, lineNumber);
            if (parsedCosmetic.isScriptlet) {
              scriptletRules.push(parsedCosmetic.rule as ParsedScriptletRule);
              stats.scriptletRules++;
            } else {
              cosmeticRules.push(parsedCosmetic.rule as ParsedCosmeticRule);
              stats.cosmeticRules++;
            }
            stats.validRules++;
            break;
          }

          case 'HostRule': {
            // Standard hosts entry in adblock format
            const pattern = (ast as any).pattern?.value || line;
            networkRules.push({
              raw: line,
              lineNumber,
              isException: false,
              pattern: pattern.startsWith('||') ? pattern : `||${pattern}^`,
            });
            stats.validRules++;
            stats.hostsRules++;
            stats.networkRules++;
            break;
          }

          case 'CommentRule':
          case 'MetadataCommentRule':
          case 'PreProcessorCommentRule':
          case 'AgentCommentRule':
          case 'ConfigCommentRule':
          case 'HintCommentRule':
          case 'EmptyRule': {
            stats.ignoredRules++;
            break;
          }

          default: {
            stats.unsupportedRules++;
            diagnostics.push({
              sourceId,
              lineNumber,
              rawRule: line,
              severity: 'UNSUPPORTED',
              message: `Unsupported AST rule type: ${(ast as any).type}`,
              category: 'UNSUPPORTED',
            });
            break;
          }
        }
      } catch (err: any) {
        stats.errorRules++;
        diagnostics.push({
          sourceId,
          lineNumber,
          rawRule: line,
          severity: 'ERROR',
          message: `Adblock syntax parse error: ${err?.message || 'Invalid syntax'}`,
          category: 'INVALID',
        });
      }
    }

    return {
      sourceId,
      networkRules,
      cosmeticRules,
      scriptletRules,
      hostsRules,
      diagnostics,
      stats,
    };
  }

  private static extractNetworkRule(ast: any, raw: string, lineNumber: number): ParsedNetworkRule {
    const isException = Boolean(ast.exception);
    const pattern = ast.pattern?.value || raw;

    let domains: string[] | undefined;
    let excludedDomains: string[] | undefined;
    let resourceTypes: string[] | undefined;
    let thirdParty: boolean | undefined;

    const modifiers: Array<{ name: string; value?: string; isException?: boolean }> = [];

    if (ast.modifiers?.children) {
      for (const mod of ast.modifiers.children) {
        const modName = mod.name?.value?.toLowerCase();
        const modValue = mod.value?.value;
        const modException = Boolean(mod.exception);

        modifiers.push({
          name: modName,
          value: modValue,
          isException: modException,
        });

        if (modName === 'third-party' || modName === '3p') {
          thirdParty = !modException;
        } else if (modName === 'domain' && modValue) {
          const domainParts = modValue.split('|');
          for (const d of domainParts) {
            const trimmed = d.trim();
            if (trimmed.startsWith('~')) {
              excludedDomains = excludedDomains || [];
              excludedDomains.push(trimmed.slice(1));
            } else if (trimmed.length > 0) {
              domains = domains || [];
              domains.push(trimmed);
            }
          }
        } else if (
          [
            'script',
            'image',
            'xmlhttprequest',
            'xhr',
            'subdocument',
            'stylesheet',
            'media',
            'websocket',
            'font',
            'other',
            'ping',
          ].includes(modName)
        ) {
          resourceTypes = resourceTypes || [];
          resourceTypes.push(modName === 'xhr' ? 'xmlhttprequest' : modName);
        }
      }
    }

    return {
      raw,
      lineNumber,
      isException,
      pattern,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
      domains,
      excludedDomains,
      resourceTypes,
      thirdParty,
    };
  }

  private static extractCosmeticRule(
    ast: any,
    raw: string,
    lineNumber: number
  ): { isScriptlet: boolean; rule: ParsedCosmeticRule | ParsedScriptletRule } {
    // 1. Scriptlet injection rule
    if (ast.type === 'ScriptletInjectionRule') {
      const paramsList = ast.body?.children?.[0]?.children || [];
      const scriptletName = paramsList[0]?.value || 'unknown';
      const args = paramsList.slice(1).map((p: any) => String(p?.value ?? ''));

      return {
        isScriptlet: true,
        rule: {
          raw,
          lineNumber,
          scriptletName,
          args,
        },
      };
    }

    // 2. Element Hiding / CSS Injection
    const selector =
      ast.body?.selectorList?.value ||
      ast.body?.value ||
      (raw.includes('##') ? raw.split('##')[1] : raw);

    return {
      isScriptlet: false,
      rule: {
        raw,
        lineNumber,
        selector,
      },
    };
  }
}
