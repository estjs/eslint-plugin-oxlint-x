
// @eslint-disable
import pluginOxlintX from '../../src/index.js';
export default [
  {
    name: 'oxlint/plugin',
    plugins: {
      oxlint: pluginOxlintX,
    },
    rules: {
      'oxlint/oxlint': ['error', {"typescript":true,"vue":true,"biome":true}],
    },
    ...{}
  },
];


      