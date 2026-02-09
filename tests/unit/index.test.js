import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RuleTester } from 'eslint';
import eslintPluginOxlint from '../../src/index.js';
import * as oxlintModule from '../../src/oxlint.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('ESLint Rule Integration', () => {
  describe('oxlint rule', () => {
    beforeEach(() => {
      // Mock the format function
      vi.spyOn(oxlintModule, 'format');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should report differences for unformatted code', async () => {
      const unformattedCode = 'const x=1;';
      const formattedCode = 'const x = 1;\n';
      
      oxlintModule.format.mockResolvedValue(formattedCode);

      ruleTester.run('oxlint', eslintPluginOxlint.rules.oxlint, {
        valid: [],
        invalid: [
          {
            code: unformattedCode,
            filename: 'test.js',
            errors: [
              {
                messageId: 'replace',
              },
            ],
          },
        ],
      });
    });

    it('should report no issues for already formatted code', async () => {
      const formattedCode = 'const x = 1;\n';
      
      oxlintModule.format.mockResolvedValue(formattedCode);

      ruleTester.run('oxlint', eslintPluginOxlint.rules.oxlint, {
        valid: [
          {
            code: formattedCode,
            filename: 'test.js',
          },
        ],
        invalid: [],
      });
    });

    it('should auto-fix unformatted code', async () => {
      const unformattedCode = 'const x=1;';
      const formattedCode = 'const x = 1;\n';
      
      oxlintModule.format.mockResolvedValue(formattedCode);

      ruleTester.run('oxlint', eslintPluginOxlint.rules.oxlint, {
        valid: [],
        invalid: [
          {
            code: unformattedCode,
            filename: 'test.js',
            output: formattedCode,
            errors: 1,
          },
        ],
      });
    });

    it('should report format errors to ESLint', async () => {
      const code = 'const x = 1;';
      const errorMessage = 'oxlint process failed';
      
      oxlintModule.format.mockRejectedValue(new Error(errorMessage));

      ruleTester.run('oxlint', eslintPluginOxlint.rules.oxlint, {
        valid: [],
        invalid: [
          {
            code,
            filename: 'test.js',
            errors: [
              {
                message: `oxlint error: ${errorMessage}`,
                line: 1,
                column: 0,
              },
            ],
          },
        ],
      });
    });

    it('should report multiple differences separately', async () => {
      const unformattedCode = 'const x=1;const y=2;';
      const formattedCode = 'const x = 1;\nconst y = 2;\n';
      
      oxlintModule.format.mockResolvedValue(formattedCode);

      ruleTester.run('oxlint', eslintPluginOxlint.rules.oxlint, {
        valid: [],
        invalid: [
          {
            code: unformattedCode,
            filename: 'test.js',
            errors: 2, // Should report at least 2 differences
          },
        ],
      });
    });
  });

  describe('plugin metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(eslintPluginOxlint.meta).toBeDefined();
      expect(eslintPluginOxlint.meta.name).toBe('eslint-plugin-oxlint-x');
      expect(eslintPluginOxlint.meta.version).toBeDefined();
    });

    it('should have recommended config', () => {
      expect(eslintPluginOxlint.configs).toBeDefined();
      expect(eslintPluginOxlint.configs.recommended).toBeDefined();
      expect(eslintPluginOxlint.configs.recommended.rules).toEqual({
        'oxlint/oxlint': 'warn',
      });
    });

    it('should have oxlint rule defined', () => {
      expect(eslintPluginOxlint.rules).toBeDefined();
      expect(eslintPluginOxlint.rules.oxlint).toBeDefined();
      expect(eslintPluginOxlint.rules.oxlint.meta).toBeDefined();
      expect(eslintPluginOxlint.rules.oxlint.create).toBeTypeOf('function');
    });
  });

  describe('rule metadata', () => {
    const rule = eslintPluginOxlint.rules.oxlint;

    it('should have correct rule type', () => {
      expect(rule.meta.type).toBe('layout');
    });

    it('should be fixable', () => {
      expect(rule.meta.fixable).toBe('code');
    });

    it('should have correct message IDs', () => {
      expect(rule.meta.messages).toBeDefined();
      expect(rule.meta.messages.insert).toBeDefined();
      expect(rule.meta.messages.delete).toBeDefined();
      expect(rule.meta.messages.replace).toBeDefined();
    });

    it('should have correct schema', () => {
      expect(rule.meta.schema).toBeDefined();
      expect(rule.meta.schema).toHaveLength(1);
      expect(rule.meta.schema[0].type).toBe('object');
      expect(rule.meta.schema[0].properties).toHaveProperty('config');
      expect(rule.meta.schema[0].properties).toHaveProperty('deny-warnings');
    });
  });
});
