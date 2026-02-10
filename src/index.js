import { oxlint } from './rules.js';

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
