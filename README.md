# eslint-plugin-oxlint

ESLint plugin that integrates oxlint (a high-performance Rust-based linter) into ESLint workflows.

## Requirements

- Node.js >= 18.0.0
- ESLint >= 9.0.0
- oxlint (installed separately)

## Installation

```bash
npm install --save-dev eslint-plugin-oxlint
```

## Usage

### ESLint Flat Config (eslint.config.js)

```javascript
import oxlint from 'eslint-plugin-oxlint';

export default [
  {
    plugins: {
      oxlint
    },
    rules: {
      'oxlint/oxlint': 'error'
    }
  }
];
```

### ESLint Legacy Config (.eslintrc.json)

```json
{
  "plugins": ["oxlint"],
  "rules": {
    "oxlint/oxlint": "error"
  }
}
```

## Configuration Options

The `oxlint/oxlint` rule accepts the following options:

- `useOxlintrc` (boolean, default: `true`): Whether to load `.oxlintrc.json` configuration file
- `oxlintConfig` (object): Direct oxlint configuration to use
- `oxlintPath` (string): Custom path to oxlint executable

### Example with Options

```javascript
{
  rules: {
    'oxlint/oxlint': ['error', {
      useOxlintrc: true,
      oxlintConfig: {
        rules: {
          'no-unused-vars': 'error'
        }
      },
      oxlintPath: '/custom/path/to/oxlint'
    }]
  }
}
```

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Test with Coverage

```bash
npm run test:coverage
```

### Lint

```bash
npm run lint
```

## License

MIT
