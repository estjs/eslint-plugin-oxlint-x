# eslint-plugin-oxlint-x

[English](README.md) | [中文](README_zh-CN.md)

---

Runs [Oxlint](https://oxc-project.github.io/docs/guide/usage/linter.html) as an ESLint rule. This allows you to integrate Oxlint's fast linting capabilities directly into your ESLint workflow, including support for `eslint --fix`.

### Features

- **Integration**: Runs `oxlint` as a standard ESLint rule.
- **Auto-fix**: Supports `eslint --fix` to automatically apply Oxlint fixes.
- **Configuration**: Supports `.oxlintrc.json` configuration files and ESLint rule options.
- **Performance**: Leverages Oxlint's speed for heavy lifting linting tasks.

### Installation

```bash
npm install eslint-plugin-oxlint-x oxlint -D
# or
pnpm add eslint-plugin-oxlint-x oxlint -D
# or
yarn add eslint-plugin-oxlint-x oxlint -D
```

### Usage

#### Flat Config (ESLint v9+)

```javascript
// eslint.config.js
import oxlint from 'eslint-plugin-oxlint-x';

export default [
  // ... other configs
  oxlint.configs.recommended,
];
```

Or manual configuration:

```javascript
import oxlintPlugin from 'eslint-plugin-oxlint-x';

export default [
  {
    plugins: {
      'oxlint-x': oxlintPlugin,
    },
    rules: {
      // Priority is higher than auto-reading .oxlintrc.json, can override .oxlintrc.json configuration
      'oxlint-x/oxlint': ['error', {
        // oxlint config
      }], 
    },
  },
];
```

#### Auto-read Configuration

```json
{
  "plugins": ["oxlint-x"],
  "rules": {
    // Automatically reads and uses .oxlintrc.json configuration
    "oxlint-x/oxlint": "warn"
  }
}
```



### How it Works

1. **Linting**: When ESLint runs, this plugin spawns an `oxlint` process for the file being linted.
2. **Reporting**: Diagnostics from Oxlint are translated into ESLint messages.
3. **Fixing**: When `eslint --fix` is triggered, issues that are auto-fixable by Oxlint will be applied.

