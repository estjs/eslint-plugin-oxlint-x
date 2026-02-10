import diff from 'fast-diff';

const LINE_ENDING_RE = /\r\n|[\n\r\u2028\u2029]/;

/**
 * Converts invisible characters to a commonly recognizable visible form.
 * 
 * Character mappings:
 * - Space (' ') → Middle Dot ('·', \u00B7)
 * - Newline ('\n') → Return Symbol ('⏎', \u23ce)
 * - Tab ('\t') → Tab Symbol ('↹', \u21b9)
 * - Carriage Return ('\r') → CR Symbol ('␍', \u240D)
 * 
 * Performance: Single-pass iteration with O(n) time complexity.
 * 
 * @param {string} str - The string with invisibles to convert
 * @returns {string} The converted string with visible representations
 */
export function showInvisibles(str) {
  let ret = '';
  // Single-pass iteration for optimal performance
  for (const element of str) {
    switch (element) {
      case ' ':
        ret += '·'; // Middle Dot, \u00B7
        break;
      case '\n':
        ret += '⏎'; // Return Symbol, \u23ce
        break;
      case '\t':
        ret += '↹'; // Left Arrow To Bar Over Right Arrow To Bar, \u21b9
        break;
      case '\r':
        ret += '␍'; // Carriage Return Symbol, \u240D
        break;
      default:
        ret += element;
        break;
    }
  }
  return ret;
}

/**
 * Generate results for differences between source code and formatted version.
 * 
 * Algorithm approach:
 * Uses fast-diff to compute INSERT, DELETE, and EQUAL operations, then batches
 * consecutive changes on the same line into friendlier "replace" operations.
 * 
 * Batching strategy:
 * - Consecutive INSERT/DELETE operations are batched together
 * - Batches are flushed when encountering line endings (EQUAL with \n, \r, etc.)
 * - DELETE followed by INSERT becomes a REPLACE operation
 * - Reduces the number of reported differences for better UX
 * 
 * Performance: O(n) where n is the number of diff operations from fast-diff.
 * 
 * @param {string} source - The original source code
 * @param {string} oxlintSource - The oxlint formatted source code
 * @returns {Array<{operation: string, offset: number, insertText?: string, deleteText?: string}>} 
 *          Array of difference objects with operation type and text changes
 */
export function generateDifferences(source, oxlintSource) {
  // fast-diff returns the differences between two texts as a series of
  // INSERT, DELETE or EQUAL operations. The results occur only in these
  // sequences:
  //           /-> INSERT -> EQUAL
  //    EQUAL |           /-> EQUAL
  //           \-> DELETE |
  //                      \-> INSERT -> EQUAL
  // Instead of reporting issues at each INSERT or DELETE, certain sequences
  // are batched together and are reported as a friendlier "replace" operation:
  // - A DELETE immediately followed by an INSERT.
  // - Any number of INSERTs and DELETEs where the joining EQUAL of one's end
  // and another's beginning does not have line endings (i.e. issues that occur
  // on contiguous lines).

  const results = diff(source, oxlintSource);
  const differences = [];

  const batch = [];
  let offset = 0; // NOTE: INSERT never advances the offset.
  
  // Process diff results and batch consecutive changes
  while (results.length > 0) {
    const result = results.shift();
    const op = result[0];
    const text = result[1];
    switch (op) {
      case diff.INSERT:
      case diff.DELETE:
        // Add to current batch
        batch.push(result);
        break;
      case diff.EQUAL:
        if (results.length > 0) {
          if (batch.length > 0) {
            // Flush batch if we hit a line ending (end of logical line)
            if (LINE_ENDING_RE.test(text)) {
              flush();
              offset += text.length;
            } else {
              // Continue batching on same line
              batch.push(result);
            }
          } else {
            // No active batch, just advance offset
            offset += text.length;
          }
        }
        break;
      default:
        throw new Error(`Unexpected fast-diff operation "${op}"`);
    }
    // Flush remaining batch at end of input
    if (batch.length > 0 && results.length === 0) {
      flush();
    }
  }

  return differences;

  /**
   * Flushes the current batch of changes into a single difference entry.
   * Combines consecutive INSERT/DELETE/EQUAL operations into one operation.
   */
  function flush() {
    let aheadDeleteText = '';
    let aheadInsertText = '';
    
    // Accumulate all text changes in the batch
    while (batch.length > 0) {
      const next = batch.shift();
      const op = next[0];
      const text = next[1];
      switch (op) {
        case diff.INSERT:
          aheadInsertText += text;
          break;
        case diff.DELETE:
          aheadDeleteText += text;
          break;
        case diff.EQUAL:
          // EQUAL text appears in both delete and insert
          aheadDeleteText += text;
          aheadInsertText += text;
          break;
      }
    }
    
    // Determine operation type and create difference entry
    if (aheadDeleteText && aheadInsertText) {
      differences.push({
        offset,
        operation: generateDifferences.REPLACE,
        insertText: aheadInsertText,
        deleteText: aheadDeleteText,
      });
    } else if (!aheadDeleteText && aheadInsertText) {
      differences.push({
        offset,
        operation: generateDifferences.INSERT,
        insertText: aheadInsertText,
      });
    } else if (aheadDeleteText && !aheadInsertText) {
      differences.push({
        offset,
        operation: generateDifferences.DELETE,
        deleteText: aheadDeleteText,
      });
    }
    
    // Advance offset by the length of deleted text
    offset += aheadDeleteText.length;
  }
}

generateDifferences.INSERT = 'insert';
generateDifferences.DELETE = 'delete';
generateDifferences.REPLACE = 'replace';
