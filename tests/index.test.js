import { describe, expect, it, vi } from 'vitest';
import { RuleTester } from 'eslint';
import eslintPluginOxlint from '../src/index.js';

// Define implementations directly in the mock to avoid scope issues
// vitest hoists this block so imports inside must be careful, but we are just returning functions.
vi.mock('../src/oxlint.js', () => ({
  lint: vi.fn().mockImplementation(code => {
    // Mock lint failures based on code content
    if (code.includes('fail')) {
      return {
        diagnostics: [
          {
            message: 'Mock Failure',
            code: 'mock-fail',
            severity: 'error',
            labels: [{ span: { offset: 0, length: 4 } }],
          },
        ],
      };
    }
    return { diagnostics: [] };
  }),
  format: vi.fn().mockImplementation(code => {
    // Mock format changes based on code content
    if (code.includes('fixme')) {
      return code.replace('fixme', 'fixed');
    }
    return code;
  }),
}));

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('eSLint Plugin Oxlint Integration', () => {
  describe('metadata', () => {
    it('should have correct plugin name', () => {
      expect(eslintPluginOxlint.meta.name).toBe('eslint-plugin-oxlint-x');
    });

    it('should have recommended config', () => {
      expect(eslintPluginOxlint.configs.recommended.rules).toEqual({
        'oxlint/oxlint': 'warn',
      });
    });

    it('should have rule metadata', () => {
      const rule = eslintPluginOxlint.rules.oxlint;
      expect(rule.meta.type).toBe('problem');
      expect(rule.meta.fixable).toBe('code');
    });
  });

  describe('rule Execution', () => {
    // Test Case 1: Valid Code
    ruleTester.run('oxlint-valid', eslintPluginOxlint.rules.oxlint, {
      valid: [{ code: 'const success = true;', filename: 'valid.js' }],
      invalid: [],
    });

    // Test Case 2: Lint Error
    ruleTester.run('oxlint-error', eslintPluginOxlint.rules.oxlint, {
      valid: [],
      invalid: [
        {
          code: 'fail',
          filename: 'fail.js',
          errors: [{ message: 'Mock Failure (mock-fail)' }],
        },
      ],
    });

    // Test Case 3: Fixable Code
    ruleTester.run('oxlint-fix', eslintPluginOxlint.rules.oxlint, {
      valid: [],
      invalid: [
        {
          code: 'const fixme = 1;',
          filename: 'fix.js',
          output: 'const fixed = 1;',
          errors: [{ message: 'Oxlint found fixable issues.' }],
        },
      ],
    });
  });
});
