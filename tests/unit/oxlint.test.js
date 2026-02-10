
import { describe, expect, it } from 'vitest';
import { mergeConfigs } from '../../src/oxlint.js';

describe('mergeConfigs', () => {
  it('should handle null and undefined configurations', () => {
    // Both null/undefined
    expect(mergeConfigs(null, null)).toEqual({});
    expect(mergeConfigs(undefined, undefined)).toEqual({});
    expect(mergeConfigs(null, undefined)).toEqual({});

    // Only optionsConfig
    expect(mergeConfigs({ a: 1 }, null)).toEqual({ a: 1 });
    expect(mergeConfigs({ a: 1 }, undefined)).toEqual({ a: 1 });

    // Only fileConfig
    expect(mergeConfigs(null, { b: 2 })).toEqual({ b: 2 });
    expect(mergeConfigs(undefined, { b: 2 })).toEqual({ b: 2 });
  });

  it('should merge configurations with file config taking priority', () => {
    const optionsConfig = { a: 1, b: 2 };
    const fileConfig = { b: 3, c: 4 };
    const result = mergeConfigs(optionsConfig, fileConfig);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should perform deep merge on nested objects', () => {
    const optionsConfig = {
      rules: {
        'rule-1': 'error',
        'rule-2': 'warn',
      },
    };
    const fileConfig = {
      rules: {
        'rule-2': 'off',
        'rule-3': 'error',
      },
    };
    const result = mergeConfigs(optionsConfig, fileConfig);

    expect(result.rules).toEqual({
      'rule-1': 'error',
      'rule-2': 'off',
      'rule-3': 'error',
    });
  });

  it('should preserve all properties from both configurations', () => {
    const optionsConfig = {
      a: 1,
      b: 2,
      nested: { x: 10 },
    };
    const fileConfig = {
      c: 3,
      d: 4,
      nested: { y: 20 },
    };
    const result = mergeConfigs(optionsConfig, fileConfig);

    expect(result).toEqual({
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      nested: { x: 10, y: 20 },
    });
  });

  it('should handle arrays by overriding (not merging)', () => {
    const optionsConfig = {
      plugins: ['plugin-1', 'plugin-2'],
    };
    const fileConfig = {
      plugins: ['plugin-3'],
    };
    const result = mergeConfigs(optionsConfig, fileConfig);

    // Arrays should be overridden, not merged
    expect(result.plugins).toEqual(['plugin-3']);
  });

  it('should handle complex nested structures', () => {
    const optionsConfig = {
      rules: {
        'rule-1': 'error',
        'rule-2': { severity: 'warn', options: { a: 1 } },
      },
      env: {
        browser: true,
      },
    };
    const fileConfig = {
      rules: {
        'rule-2': { severity: 'off', options: { b: 2 } },
        'rule-3': 'error',
      },
      env: {
        node: true,
      },
    };
    const result = mergeConfigs(optionsConfig, fileConfig);

    expect(result).toEqual({
      rules: {
        'rule-1': 'error',
        'rule-2': { severity: 'off', options: { a: 1, b: 2 } },
        'rule-3': 'error',
      },
      env: {
        browser: true,
        node: true,
      },
    });
  });

  it('should handle empty configurations', () => {
    expect(mergeConfigs({}, {})).toEqual({});
    expect(mergeConfigs({ a: 1 }, {})).toEqual({ a: 1 });
    expect(mergeConfigs({}, { b: 2 })).toEqual({ b: 2 });
  });

  it('should override primitive with object and vice versa', () => {
    const base = { a: 1, b: { x: 1 } };
    const override = { a: { y: 2 }, b: 2 };
    const result = mergeConfigs(base, override);

    expect(result).toEqual({
      a: { y: 2 },
      b: 2
    });
  });

  it('should handle arrays within nested objects', () => {
    const base = { nesting: { items: [1, 2] } };
    const override = { nesting: { items: [3] } };
    const result = mergeConfigs(base, override);

    expect(result).toEqual({
      nesting: { items: [3] }
    });
  });

  it('should not merge when override has null value for a key', () => {
    // If we explicitly set null, it might be intended to clear it (or just result in null)
    // Based on implementation: if valB is null, it's not an object (typeof null is 'object' but valB !== null check handles it)
    // So it falls to `result[key] = valB`
    const base = { a: { x: 1 } };
    const override = { a: null };
    const result = mergeConfigs(base, override);

    expect(result).toEqual({ a: null });
  });

  it('should handle deep nesting levels', () => {
    const base = { level1: { level2: { level3: { a: 1 } } } };
    const override = { level1: { level2: { level3: { b: 2 } } } };
    const result = mergeConfigs(base, override);

    expect(result).toEqual({
      level1: {
        level2: {
          level3: { a: 1, b: 2 }
        }
      }
    });
  });
});
