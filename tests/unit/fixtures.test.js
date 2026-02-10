
import { join, resolve } from 'node:path';
import { execa } from 'execa';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { afterAll, beforeAll, it, describe, expect } from 'vitest';
import { resolveOxlintBinary, resolveOxlintConfigFile } from '../../src/oxlint.js';

const tempDir = resolve('_fixtures');
const inputDir = resolve('tests/unit/fixtures/input');
const outputDir = resolve('tests/unit/fixtures/output');

beforeAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});
afterAll(async () => {
  // await fs.rm(tempDir, { recursive: true, force: true });
});

// --- Standard Configuration Tests (Snapshot Regression) ---

runWithConfig('js', {
  vue: false,
});
runWithConfig('all', {
  typescript: true,
  vue: true,
  react: true,
});
runWithConfig('no-style', {
  typescript: true,
  vue: true,
});
runWithConfig('tab-double-quotes', {
  typescript: true,
  vue: true,
});

runWithConfig('ts-override', {
  typescript: true,
});

runWithConfig('ts-strict', {});

runWithConfig('ts-strict-with-react', {
  react: true,
});

runWithConfig('with-formatters', {
  typescript: true,
  vue: true,
});

runWithConfig('no-markdown-with-formatters', {});

// New test configuration with biome enabled
runWithConfig('with-biome', {
  typescript: true,
  vue: true,
  biome: true,
});

// Same configuration as 'all' but with biome enabled for comparison
runWithConfig('all-with-biome', {
  typescript: true,
  vue: true,
  react: true,
  biome: true,
});

// --- Supplementary Tests (As requested) ---

describe('Oxlint Behavior & Resolution', () => {

  // 1. Should correctly read-in and apply oxlint configurations
  it('1. Should correctly read-in and apply oxlint configurations', async () => {
    const name = 'config-effective';
    const target = resolve(tempDir, name);
    await fs.copy(inputDir, target);

    // Add debugger to trigger rule
    await fs.appendFile(join(target, 'javascript.js'), '\ndebugger;');

    // Manually disable no-debugger in .oxlintrc.json
    await fs.writeJson(join(target, '.oxlintrc.json'), {
      rules: { "no-debugger": "off" }
    });

    await fs.writeFile(
      join(target, 'eslint.config.js'),
      `
import pluginOxlintX from '../../src/index.js';
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
      `
    );

    const { stdout } = await execa('npx', ['eslint', '.', '--format', 'json'], {
      cwd: target,
      reject: false,
    });

    const results = JSON.parse(stdout);
    const fileResult = results.find(r => r.filePath.includes('javascript.js'));
    const messages = fileResult ? fileResult.messages : [];

    // Should be applied correctly (no debugger error reported because it's disabled)
    const hasDebuggerError = messages.some(m => m.message.includes('no-debugger'));
    expect(hasDebuggerError).toBe(false);
  }, 30000);

  // 2. Verified that both Oxlint and custom rules take effect
  it('2. Verified that both Oxlint and custom rules take effect', async () => {
    const name = 'config-priority';
    const target = resolve(tempDir, name);
    await fs.copy(inputDir, target);

    // Add debugger to trigger rule
    await fs.appendFile(join(target, 'javascript.js'), '\ndebugger;');

    // .oxlintrc.json disables no-debugger
    await fs.writeJson(join(target, '.oxlintrc.json'), {
      rules: { "no-debugger": "off" }
    });

    // But force re-enable it in eslint.config.js via rule options
    await fs.writeFile(
      join(target, 'eslint.config.js'),
      `
import pluginOxlintX from '../../src/index.js';
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
      `
    );

    const { stdout } = await execa('npx', ['eslint', '.', '--format', 'json'], {
      cwd: target,
      reject: false,
    });

    const results = JSON.parse(stdout);
    const fileResult = results.find(r => r.filePath.includes('javascript.js'));
    const messages = fileResult ? fileResult.messages : [];

    // Custom rules have higher priority and should re-trigger the error
    const hasDebuggerError = messages.some(m => m.message.includes('no-debugger'));
    expect(hasDebuggerError).toBe(true);
  }, 30000);

  // 3. How to find oxlint
  describe('3. How to find oxlint', () => {
    it('resolveOxlintBinary should be able to find the executable path', () => {
      const binary = resolveOxlintBinary();
      expect(binary).toBeDefined();
      expect(typeof binary).toBe('string');
      // If it doesn't fallback to 'oxlint', the path should exist
      if (binary !== 'oxlint' && !binary.startsWith('node')) { // Ignore some possible require path conversions
        expect(fs.existsSync(binary)).toBe(true);
      }
    });

    it('resolveOxlintConfigFile should be able to automatically find .oxlintrc.json upwards', async () => {
      const target = resolve(tempDir, 'resolve-oxlintrc');
      await fs.ensureDir(join(target, 'nested/dir'));
      const configPath = join(target, '.oxlintrc.json');
      await fs.writeJson(configPath, {});

      const found = resolveOxlintConfigFile(join(target, 'nested/dir/file.js'));
      expect(found).toBe(configPath);
    });
  });
});

// --- Helper Functions ---

function runWithConfig(name, configs = {}, items = {}) {
  it(
    name,
    async () => {
      const target = resolve(tempDir, name);
      const output = join(outputDir, name);

      await fs.copy(inputDir, target, {
        filter: src => !src.includes('node_modules'),
      });

      await fs.writeFile(
        join(target, 'eslint.config.js'),
        `
// @eslint-disable
import pluginOxlintX from '../../src/index.js';
export default [
  {
    name: 'oxlint/plugin',
    plugins: {
      oxlint: pluginOxlintX,
    },
    rules: {
      'oxlint/oxlint': ['error', ${JSON.stringify(configs)}],
    },
    ...${JSON.stringify(items)}
  },
];


      `,
      );

      await execa('npx', ['eslint', './', '--fix'], {
        cwd: target,
        stdio: 'pipe',
        reject: false,
      });

      const files = await fg('**/*', {
        ignore: ['node_modules', 'eslint.config.js', '.oxlintrc.json'],
        cwd: target,
      });

      for (const file of files) {
        const content = await fs.readFile(join(target, file), 'utf-8');
        const sourcePath = join(inputDir, file);
        const source = (await fs.pathExists(sourcePath)) ? await fs.readFile(sourcePath, 'utf-8') : null;

        if (source !== null && content === source) {
          continue;
        }

        await expect.soft(content).toMatchFileSnapshot(join(output, file));
      }
    },
    300000,
  );
}
