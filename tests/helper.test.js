import { describe, it, expect } from 'vitest';
import { showInvisibles, generateDifferences } from '../src/helper.js';

describe('showInvisibles', () => {
  it('should convert spaces to middle dots', () => {
    expect(showInvisibles('hello world')).toBe('hello·world');
    expect(showInvisibles('   ')).toBe('···');
  });

  it('should convert newlines to return symbols', () => {
    expect(showInvisibles('line1\nline2')).toBe('line1⏎line2');
    expect(showInvisibles('\n\n')).toBe('⏎⏎');
  });

  it('should convert tabs to tab symbols', () => {
    expect(showInvisibles('hello\tworld')).toBe('hello↹world');
    expect(showInvisibles('\t\t')).toBe('↹↹');
  });

  it('should convert carriage returns to CR symbols', () => {
    expect(showInvisibles('line1\rline2')).toBe('line1␍line2');
    expect(showInvisibles('\r\r')).toBe('␍␍');
  });

  it('should handle mixed invisible characters', () => {
    expect(showInvisibles(' \t\n\r')).toBe('·↹⏎␍');
    expect(showInvisibles('a b\tc\nd\re')).toBe('a·b↹c⏎d␍e');
  });

  it('should not modify strings with no invisible characters', () => {
    expect(showInvisibles('hello')).toBe('hello');
    expect(showInvisibles('abc123')).toBe('abc123');
    expect(showInvisibles('')).toBe('');
  });

  it('should handle empty string', () => {
    expect(showInvisibles('')).toBe('');
  });
});

describe('generateDifferences', () => {
  it('should detect INSERT operation', () => {
    const source = 'hello';
    const formatted = 'hello world';
    const diffs = generateDifferences(source, formatted);
    
    expect(diffs).toHaveLength(1);
    expect(diffs[0].operation).toBe('insert');
    expect(diffs[0].insertText).toBe(' world');
    expect(diffs[0].offset).toBe(5);
  });

  it('should detect DELETE operation', () => {
    const source = 'hello world';
    const formatted = 'hello';
    const diffs = generateDifferences(source, formatted);
    
    expect(diffs).toHaveLength(1);
    expect(diffs[0].operation).toBe('delete');
    expect(diffs[0].deleteText).toBe(' world');
    expect(diffs[0].offset).toBe(5);
  });

  it('should detect REPLACE operation', () => {
    const source = 'hello world';
    const formatted = 'hello universe';
    const diffs = generateDifferences(source, formatted);
    
    expect(diffs).toHaveLength(1);
    expect(diffs[0].operation).toBe('replace');
    expect(diffs[0].deleteText).toBe('world');
    expect(diffs[0].insertText).toBe('universe');
    expect(diffs[0].offset).toBe(6); // After 'hello '
  });

  it('should batch consecutive changes on same line', () => {
    const source = 'const x=1;';
    const formatted = 'const x = 1;';
    const diffs = generateDifferences(source, formatted);
    
    // Should batch the space additions into one operation
    expect(diffs).toHaveLength(1);
    expect(diffs[0].operation).toBe('replace');
  });

  it('should flush batch at line endings', () => {
    const source = 'const x=1;\nconst y=2;';
    const formatted = 'const x = 1;\nconst y = 2;';
    const diffs = generateDifferences(source, formatted);
    
    // Should create separate operations for each line
    expect(diffs.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty source string', () => {
    const source = '';
    const formatted = 'hello';
    const diffs = generateDifferences(source, formatted);
    
    expect(diffs).toHaveLength(1);
    expect(diffs[0].operation).toBe('insert');
    expect(diffs[0].insertText).toBe('hello');
  });

  it('should handle empty formatted string', () => {
    const source = 'hello';
    const formatted = '';
    const diffs = generateDifferences(source, formatted);
    
    expect(diffs).toHaveLength(1);
    expect(diffs[0].operation).toBe('delete');
    expect(diffs[0].deleteText).toBe('hello');
  });

  it('should return empty array for identical strings', () => {
    const source = 'hello world';
    const formatted = 'hello world';
    const diffs = generateDifferences(source, formatted);
    
    expect(diffs).toHaveLength(0);
  });

  it('should handle multiple changes across lines', () => {
    const source = 'line1\nline2\nline3';
    const formatted = 'line1\nmodified\nline3';
    const diffs = generateDifferences(source, formatted);
    
    expect(diffs.length).toBeGreaterThan(0);
    const hasReplace = diffs.some(d => d.operation === 'replace');
    expect(hasReplace).toBe(true);
  });

  it('should correctly calculate offsets', () => {
    const source = 'abc def ghi';
    const formatted = 'abc xyz ghi';
    const diffs = generateDifferences(source, formatted);
    
    expect(diffs).toHaveLength(1);
    expect(diffs[0].offset).toBe(4); // After 'abc '
  });
});

describe('generateDifferences constants', () => {
  it('should export operation constants', () => {
    expect(generateDifferences.INSERT).toBe('insert');
    expect(generateDifferences.DELETE).toBe('delete');
    expect(generateDifferences.REPLACE).toBe('replace');
  });
});
