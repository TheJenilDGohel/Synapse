import { 
  toMinimalWriteResponse, 
  applyReadFormatToItems, 
  applyReadFormatToBundle,
  ReadResponseFormat 
} from '../common/terse-utils.js';

/**
 * Options for response standardization.
 */
export interface StandardizeOptions {
  /** 'minimal' for write-side token savings */
  terse?: string;
  /** 'compact' or 'lite' for read-side token savings */
  item_format?: string;
}

/**
 * McpResponseMapper encapsulates the logic for 'terse' and 'item_format' 
 * formatting parameters. It centralizes optimization logic previously 
 * scattered across tool handlers.
 * 
 * Reference: Hardening Report 1.1
 */
export class McpResponseMapper {
  /**
   * Standardizes tool responses by applying 'terse' (write-side)
   * or 'item_format' (read-side) optimizations.
   */
  static standardizeResponse(result: any, options: StandardizeOptions = {}) {
    const { terse, item_format } = options;

    // 1. Write-side: minimal responses ({id, ok})
    if (terse === 'minimal') {
      return toMinimalWriteResponse(result, 'minimal');
    }

    // 2. Read-side: Reshape items for token savings (compact/lite)
    if (item_format && item_format !== 'verbose') {
      const format = item_format as ReadResponseFormat;
      
      if (result && typeof result === 'object') {
        if (Array.isArray(result.items)) {
          return applyReadFormatToItems(result, format);
        }
        // Fallback for bundles or objects with mixed arrays
        return applyReadFormatToBundle(result, format);
      }
    }

    // 3. Verbose (default) or unrecognized shape
    return result;
  }
}
