import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path, { dirname, join, } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import process from 'node:process';


const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const userDefinedOxlintPath = join(process.cwd(), 'node_modules', '.bin', 'oxlint');
// use project temp path
const TEMP_DIR_NAME = '.oxlint-temp';
const TEMP_DIR_PATH = join(process.cwd(), 'node_modules', TEMP_DIR_NAME);

/**
 * Resolves the path to the oxlint binary.
 * @returns {string} Path to the oxlint binary or 'oxlint' if not found.
 */
export function resolveOxlintBinary() {
  // 1. Try user defined path (node_modules/.bin/oxlint in cwd)
  try {
    if (fs.existsSync(userDefinedOxlintPath)) {
      return userDefinedOxlintPath;
    }
  } catch { }

  // 2. Try resolving oxlint package
  try {
    // Try to resolve package.json first
    try {
      // Attempt to find package.json of oxlint to confirm location
      const pkgIoPath = require.resolve('oxlint/package.json', {
        paths: [process.cwd(), __dirname],
      });
      const binPath = join(dirname(pkgIoPath), 'bin', 'oxlint');
      if (fs.existsSync(binPath)) return binPath;
    } catch { }

    // Fallback to main entry point resolution if package.json is hidden
    const entryPath = require.resolve('oxlint', { paths: [process.cwd(), __dirname] });
    // entryPath is likely .../oxlint/dist/index.js
    let current = dirname(entryPath);
    // Go up until we find bin/oxlint or hit root
    for (let i = 0; i < 4; i++) {
      const check = join(current, 'bin', 'oxlint');
      if (fs.existsSync(check)) return check;
      current = dirname(current);
    }
  } catch { }

  // 3. Fallback to local node_modules relative to this file (monorepo structure)
  try {
    const local = join(__dirname, '..', 'node_modules', 'oxlint', 'bin', 'oxlint');
    if (fs.existsSync(local)) return local;
  } catch { }

  // 4. Fallback to PATH
  return 'oxlint';
}

// Cache the oxlint binary path resolution
const oxlintPath = resolveOxlintBinary();

// Simple LRU-like cache for config paths to avoid repeated disk access
const configPathCache = new Map();

/**
 * Finds the nearest .oxlintrc.json configuration file.
 * @param {string} startPath
 * @returns {string|null} Path to the configuration file or null if not found.
 */
export function resolveOxlintConfigFile(startPath) {
  const cached = configPathCache.get(startPath);
  if (cached !== undefined) return cached;

  let currentDir = dirname(startPath);
  while (true) {
    const configPath = join(currentDir, '.oxlintrc.json');
    try {
      fs.accessSync(configPath);
      configPathCache.set(startPath, configPath);
      return configPath;
    } catch {
      // Not found, go up
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      configPathCache.set(startPath, null);
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Ensures the temporary directory exists.
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR_PATH)) {
    fs.mkdirSync(TEMP_DIR_PATH, { recursive: true });
  }
}

/**
 * Writes content to a random temporary file.
 * @param {string} content
 * @param {string} originalFilePath
 * @returns {string} Path to the created temp file
 */
function createTempFile(content, originalFilePath) {
  const ext = originalFilePath ? originalFilePath.split('.').pop() : 'js';
  const tempFileName = `${TEMP_DIR_NAME}-lint-${randomBytes(16).toString('hex')}.${ext}`;
  const tempFilePath = join(TEMP_DIR_PATH, tempFileName);
  fs.writeFileSync(tempFilePath, content);
  return tempFilePath;
}

/**
 * Writes config content to a random temporary file.
 * @param {object} config
 * @returns {string} Path to the created temp file
 */
export function createTempConfigFile(config) {
  const tempFileName = `${TEMP_DIR_NAME}-config-${randomBytes(16).toString('hex')}.json`;
  const tempFilePath = join(TEMP_DIR_PATH, tempFileName);
  fs.writeFileSync(tempFilePath, JSON.stringify(config));
  return tempFilePath;
}

/**
 * Merges two configurations.
 * @param {object} base
 * @param {object} override
 * @returns {object}
 */
export function mergeConfigs(base, override) {
  if (!base) return override || {};
  if (!override) return base || {};

  const result = { ...base };
  for (const key of Object.keys(override)) {
    const valA = result[key];
    const valB = override[key];
    if (
      typeof valA === 'object' &&
      valA !== null &&
      !Array.isArray(valA) &&
      typeof valB === 'object' &&
      valB !== null &&
      !Array.isArray(valB)
    ) {
      result[key] = mergeConfigs(valA, valB);
    } else {
      result[key] = valB;
    }
  }
  return result;
}

/**
 * Executes the oxlint command synchronously.
 * @param {string[]} args
 * @returns {string} Stdout of the command
 */
function executeOxlint(args, options = {}) {
  const stdio = options.stdio || ['ignore', 'pipe', 'pipe'];
  const cwd = options.cwd || process.cwd();

  const result = spawnSync(oxlintPath, args, { stdio, cwd, encoding: 'utf-8' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && result.stderr && !result.stdout) {
    throw new Error(`Oxlint exited with code ${result.status}\nStderr: ${result.stderr}`);
  }

  return result.stdout || '';
}

/**
 * Lint code using oxlint via temp file.
 */
export function lint(code, filePath, config = {}) {
  ensureTempDir();
  const cleanupTasks = [];

  try {
    let finalConfig = config;

    const realConfigPath = resolveOxlintConfigFile(filePath);
    if (realConfigPath) {
      try {
        const fileContent = fs.readFileSync(realConfigPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent);
        finalConfig = mergeConfigs(fileConfig, config);
      } catch (e) {
        // Ignore error if config file is invalid, just use inline config
      }
    }

    const tempFilePath = createTempFile(code, filePath);
    cleanupTasks.push(() => fs.unlinkSync(tempFilePath));

    const cwd = dirname(tempFilePath);
    const args = [
      '--format=json',
      '--no-ignore',
      path.basename(tempFilePath),
    ];

    if (finalConfig && Object.keys(finalConfig).length > 0) {
      const mergedConfigPath = createTempConfigFile(finalConfig);
      cleanupTasks.push(() => fs.unlinkSync(mergedConfigPath));
      // Use the merged config
      args.push('--config', mergedConfigPath);
    } else if (realConfigPath) {
      // Should not strictly happen if we merge with empty inline config, but as fallback
      args.push('--config', realConfigPath);
    }

    const stdout = executeOxlint(args, { cwd });
    try {
      return stdout.trim() ? JSON.parse(stdout) : { diagnostics: [] };
    } catch (error) {
      throw new Error(`Failed to parse oxlint output: ${error.message}\nOutput: ${stdout}`);
    }
  } finally {
    for (const task of cleanupTasks) {
      try {
        task();
      } catch { }
    }
  }
}

/**
 * Format code using oxlint (requires --fix).
 */
export function format(code, filePath, config = {}) {
  ensureTempDir();
  const cleanupTasks = [];

  try {
    let finalConfig = config;
    const realConfigPath = resolveOxlintConfigFile(filePath);

    if (realConfigPath) {
      try {
        const fileContent = fs.readFileSync(realConfigPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent);
        finalConfig = mergeConfigs(fileConfig, config);
      } catch (e) {
        // Ignore
      }
    }

    // Prepare temp file for code
    const tempFilePath = createTempFile(code, filePath);
    cleanupTasks.push(() => fs.unlinkSync(tempFilePath));

    const cwd = dirname(tempFilePath);
    const args = ['--fix', path.basename(tempFilePath)];

    if (finalConfig && Object.keys(finalConfig).length > 0) {
      const mergedConfigPath = createTempConfigFile(finalConfig);
      cleanupTasks.push(() => fs.unlinkSync(mergedConfigPath));
      args.push('--config', mergedConfigPath);
    } else if (realConfigPath) {
      args.push('--config', realConfigPath);
    }

    executeOxlint(args, { stdio: 'ignore', cwd });
    return fs.readFileSync(tempFilePath, 'utf-8');
  } finally {
    for (const task of cleanupTasks) {
      try {
        task();
      } catch { }
    }
  }
}
