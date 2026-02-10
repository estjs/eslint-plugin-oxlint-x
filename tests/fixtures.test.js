import { join, resolve } from 'node:path';
import { execa } from 'execa';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { afterAll, beforeAll, it, describe, expect } from 'vitest';
import { resolveOxlintBinary, resolveOxlintConfigFile } from '../src/oxlint.js';

const inputDir = resolve('tests/fixtures/input');
const outputDir = resolve('tests/fixtures/output');
const tempDir = resolve('tests/_fixtures');

beforeAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});


runWithConfig('default', {});

runWithConfig('with-typescript', {
  typescript: true,
});

runWithConfig('with-react', {
  react: true,
});

runWithConfig('with-vue', {
  vue: true,
});

runWithConfig('all-plugins', {
  typescript: true,
  react: true,
  vue: true,
});

/**
 * Run ESLint with oxlint plugin configuration and compare output
 * @param {string} name - Test name
 * @param {object} configs - Oxlint plugin configuration
 * @param {object} items - Additional ESLint config items
 */
function runWithConfig(name, configs = {}, items = {}) {
  it.concurrent(
    name,
    async ({ expect }) => {
      const output = resolve(outputDir, name);
      const target = resolve(tempDir, name);

      // Copy input files to temp directory
      await fs.copy(inputDir, target, {
        filter: src => !src.includes('node_modules'),
      });

      // Write ESLint config
      await fs.writeFile(
        join(target, 'eslint.config.js'),
        `// @eslint-disable
import pluginOxlintX from '../../../src/index.js';
export default [
  {
    name: 'oxlint/plugin',
    plugins: {
      oxlint: pluginOxlintX,
    },
    rules: {
      'oxlint/oxlint': ['warn', ${JSON.stringify(configs)}],
    },
    ${JSON.stringify(items) ? `...${JSON.stringify(items)}` : ''}
  },
];
`,
      );

      // Run ESLint with fix
      await execa('npx', ['eslint', './', '--fix'], {
        cwd: target,
        stdio: 'pipe',
        reject: false,
      });

      // Get all files and compare with snapshots
      const files = await fg('**/*', {
        ignore: ['node_modules', 'eslint.config.js'],
        cwd: target,
      });

      await Promise.all(
        files.map(async file => {
          const content = await fs.readFile(join(target, file), 'utf-8');
          const source = await fs.readFile(join(inputDir, file), 'utf-8');
          const outputPath = join(output, file);

          // If content unchanged, remove output file if exists
          if (content === source) {
            if (fs.existsSync(outputPath)) {
              await fs.remove(outputPath);
            }
            return;
          }

          // Compare with snapshot
          await expect.soft(content).toMatchFileSnapshot(join(output, file));
        }),
      );
    },
    60000,
  );
}


describe('Configuration Tests', () => {
  describe('Config Resolution', () => {
    it('should correctly read and apply .oxlintrc.json configuration', async () => {
      const target = join(tempDir, 'config-test');
      await fs.copy(inputDir, target, {
        filter: src => !src.includes('node_modules'),
      });

      // Add debugger to trigger rule
      await fs.appendFile(join(target, 'javascript.js'), '\ndebugger;');

      // Disable no-debugger in .oxlintrc.json
      await fs.writeJson(join(target, '.oxlintrc.json'), {
        rules: { 'no-debugger': 'off' },
      });

      // Write ESLint config
      await fs.writeFile(
        join(target, 'eslint.config.js'),
        `
import pluginOxlintX from '../../../src/index.js';
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
];
        `,
      );

      const { stdout } = await execa('npx', ['eslint', '.', '--format', 'json'], {
        cwd: target,
        reject: false,
      });

      const results = JSON.parse(stdout);
      const jsFile = results.find(r => r.filePath.includes('javascript.js'));

      // Should not report debugger error because it's disabled in config
      expect(jsFile).toBeDefined();
      const hasDebuggerError = jsFile.messages.some(m => m.message.includes('no-debugger'));
      expect(hasDebuggerError).toBe(false);
    }, 30000);

    it('should find .oxlintrc.json in parent directories', async () => {
      const target = join(tempDir, 'resolve-oxlintrc');
      await fs.ensureDir(join(target, 'nested/dir'));
      const configPath = join(target, '.oxlintrc.json');
      await fs.writeJson(configPath, {});

      const found = resolveOxlintConfigFile(join(target, 'nested/dir/file.js'));
      expect(found).toBe(configPath);
    });
  });

  describe('Config Priority', () => {
    it('should document .oxlintrc.json precedence behavior', async () => {
      const target = join(tempDir, 'config-priority');
      await fs.copy(inputDir, target, {
        filter: src => !src.includes('node_modules'),
      });

      // Add debugger to trigger rule
      await fs.appendFile(join(target, 'javascript.js'), '\ndebugger;');

      // Disable no-debugger in .oxlintrc.json
      await fs.writeJson(join(target, '.oxlintrc.json'), {
        rules: { 'no-debugger': 'off' },
      });

      // Try to re-enable it in eslint.config.js
      await fs.writeFile(
        join(target, 'eslint.config.js'),
        `
import pluginOxlintX from '../../../src/index.js';
export default [
  {
    name: 'oxlint/plugin',
    plugins: {
      oxlint: pluginOxlintX,
    },
    rules: {
      'oxlint/oxlint': ['warn', {
        rules: { "no-debugger": "error" }
      }],
    },
  },
];
        `,
      );

      const { stdout } = await execa('npx', ['eslint', '.', '--format', 'json'], {
        cwd: target,
        reject: false,
      });

      const results = JSON.parse(stdout);
      const jsFile = results.find(r => r.filePath.includes('javascript.js'));

      // Note: .oxlintrc.json takes precedence over inline config
      expect(jsFile).toBeDefined();
      const hasDebuggerError = jsFile.messages.some(m => m.message.includes('no-debugger'));
      expect(hasDebuggerError).toBe(false);
    }, 30000);
  });
});


describe('Integration Tests', () => {
  describe('Binary Resolution', () => {
    it('should resolve oxlint binary path', () => {
      const binary = resolveOxlintBinary();
      expect(binary).toBeDefined();
      expect(typeof binary).toBe('string');

      // If not fallback, path should exist
      if (binary !== 'oxlint' && !binary.startsWith('node')) {
        expect(fs.existsSync(binary)).toBe(true);
      }
    });
  });
});
