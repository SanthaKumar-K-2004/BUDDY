/**
 * @buddy/filter-pipeline - normalizer/normalizer.ts
 * Deterministic text normalization, line-ending standardization,
 * BOM stripping, and metadata directive extraction.
 */

export interface NormalizedFilterMetadata {
  title?: string;
  version?: string;
  lastModified?: string;
  homepage?: string;
  license?: string;
  expires?: string;
  redirectUrl?: string;
  customHeaders: Record<string, string>;
}

export interface NormalizedFilterResult {
  rawContent: string;
  normalizedContent: string;
  lines: string[];
  metadata: NormalizedFilterMetadata;
  totalLines: number;
  commentLines: number;
  blankLines: number;
  ruleLines: number;
}

export class FilterNormalizer {
  /**
   * Normalizes raw filter text deterministically.
   * 1. Strips UTF-8 BOM if present.
   * 2. Normalizes CRLF and CR to LF.
   * 3. Trims trailing whitespace from each line.
   * 4. Extracts metadata headers.
   * 5. Filters out blank lines while keeping line numbers traceable.
   */
  public static normalize(raw: string): NormalizedFilterResult {
    // 1. Strip UTF-8 BOM
    let text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;

    // 2. Normalize line breaks to \n
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const rawLines = text.split('\n');
    const cleanedLines: string[] = [];
    const metadata: NormalizedFilterMetadata = {
      customHeaders: {},
    };

    let blankLines = 0;
    let commentLines = 0;
    let ruleLines = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trimEnd();

      if (line.trim().length === 0) {
        blankLines++;
        continue;
      }

      // Check for comments (excluding cosmetic rule prefixes like ##, #@#, #?#, #%#)
      const isComment = line.startsWith('!') || (line.startsWith('#') && !line.startsWith('##') && !line.startsWith('#@#') && !line.startsWith('#?#') && !line.startsWith('#%#'));
      if (isComment) {
        commentLines++;
        // Check for metadata headers in comments (e.g. ! Title: EasyList)
        FilterNormalizer.parseMetadataDirective(line, metadata);
        cleanedLines.push(line);
      } else {
        ruleLines++;
        cleanedLines.push(line);
      }
    }

    const normalizedContent = cleanedLines.join('\n') + (cleanedLines.length > 0 ? '\n' : '');

    return {
      rawContent: raw,
      normalizedContent,
      lines: cleanedLines,
      metadata,
      totalLines: rawLines.length,
      commentLines,
      blankLines,
      ruleLines,
    };
  }

  private static parseMetadataDirective(line: string, metadata: NormalizedFilterMetadata): void {
    const match = line.match(/^[!#]\s*([a-zA-Z0-9_\s-]+):\s*(.+)$/);
    if (!match) return;

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();

    switch (key) {
      case 'title':
        metadata.title = value;
        break;
      case 'version':
        metadata.version = value;
        break;
      case 'last modified':
      case 'last-modified':
        metadata.lastModified = value;
        break;
      case 'homepage':
        metadata.homepage = value;
        break;
      case 'licence':
      case 'license':
        metadata.license = value;
        break;
      case 'expires':
        metadata.expires = value;
        break;
      case 'redirect':
        metadata.redirectUrl = value;
        break;
      default:
        metadata.customHeaders[key] = value;
        break;
    }
  }
}
