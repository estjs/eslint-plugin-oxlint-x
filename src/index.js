import { oxlint } from './rules.js';

/**
 * ESLint plugin for integrating Oxlint linter.
 * Provides rules and configurations for using Oxlint within ESLint.
 * 
 * @type {import('eslint').ESLint.Plugin}
 */
const plugin = {
  meta: {
    name: 'eslint-plugin-oxlint-x',
    version: '0.9.20',
  },
  rules: {
    oxlint,
  },
  configs: {
    // Legacy config
    'recommended': {
      plugins: ['oxlint-x'],
      rules: {
        'oxlint-x/oxlint': 'warn',
      },
    },
    // Flat config
    'flat/recommended': {
      plugins: {
        get 'oxlint-x'() {
          return plugin;
        },
      },
      rules: {
        'oxlint-x/oxlint': 'warn',
      },
    },
  },
};

/**
 * Helper function to create ESLint flat config with Oxlint integration.
 * 
 * @param {object} items - Additional ESLint config items to merge
 * @param {object} configs - Oxlint configuration options (plugins, rules, etc.)
 * @returns {Array<object>} ESLint flat config array
 * 
 * @example
 * import { estjs } from 'eslint-plugin-oxlint-x';
 * 
 * export default estjs({
 *   files: ['**\/*.js'],
 * }, {
 *   plugins: ['typescript'],
 *   rules: { 'no-debugger': 'error' }
 * });
 */
export function estjs(items = {}, configs = {}) {
  return [
    {
      plugins: {
        'oxlint-x': plugin,
      },
      rules: {
        'oxlint-x/oxlint': ['error', configs],
      },
      ...items,
    },
  ];
}

export default plugin;
