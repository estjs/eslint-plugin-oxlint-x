import { estjs } from '@estjs/eslint-config';
import pluginOxlintX from "../src"
export default [

  {
      name: 'oxlint/plugin',
      plugins: {
        oxlint: pluginOxlintX,
      },
      rules: {
        'oxlint/oxlint': 'warn',
      },
  },
  
  ...estjs()
]
