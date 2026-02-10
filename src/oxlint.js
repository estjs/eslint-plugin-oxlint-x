import { createSyncFn } from 'synckit';
import path, { dirname, join, } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import process from 'node:process';


const userDefinedOxlintPath = join(process.cwd(), 'node_modules', '.bin', 'oxlint');
// use project temp path
const TEMP_DIR_NAME = '.oxlint-temp';
const TEMP_DIR_PATH = join(process.cwd(), 'node_modules', TEMP_DIR_NAME);


export function resolveOxlintBinary() {
  if (fs.existsSync(userDefinedOxlintPath)) {
    return userDefinedOxlintPath;
  }

}

// Cache the oxlint binary path resolution
const oxlintPath = resolveOxlintBinary();

const executeOxlintWorker = createSyncFn(
  new URL(`./oxlint-worker.js`, import.meta.url).href
);

// Track temporary files for cleanup
const tempFiles = new Set();

// Register cleanup handler for process exit
process.on('exit', () => {
  for (const file of tempFiles) {
    try {
      fs.unlinkSync(file);
    } catch {
      // Ignore cleanup errors
    }
  }
});

/**
 * Finds the nearest .oxlintrc.json configuration file by traversing upward.
 * Performs fresh traversal on each call (no caching).
 * 
 * @param {string} startPath - Starting file path
 * @returns {string|null} Path to the configuration file or null if not found
 */
export function resolveOxlintConfigFile(startPath) {
  let currentDir = dirname(startPath);

  while (true) {
    const configPath = join(currentDir, '.oxlintrc.json');
    try {
      fs.accessSync(configPath);
      return configPath;
    } catch {
      // Not found, go up
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
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
 * Tracks a temporary file for cleanup.
 * @param {string} filePath - Path to the temporary file
 */
function trackTempFile(filePath) {
  tempFiles.add(filePath);
}

/**
 * Cleans up a temporary file and removes it from tracking.
 * @param {string} filePath - Path to the temporary file
 */
function cleanupTempFile(filePath) {
  tempFiles.delete(filePath);
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Writes content to a random temporary file.
 * @param {string} content - File content
 * @param {string} originalFilePath - Original file path (for extension)
 * @returns {string} Path to the created temp file
 */
function createTempFile(content, originalFilePath) {
  const ext = originalFilePath ? originalFilePath.split('.').pop() : 'js';
  const tempFileName = `${TEMP_DIR_NAME}-lint-${randomBytes(16).toString('hex')}.${ext}`;
  const tempFilePath = join(TEMP_DIR_PATH, tempFileName);
  fs.writeFileSync(tempFilePath, content);
  trackTempFile(tempFilePath);
  return tempFilePath;
}

/**
 * Writes config content to a random temporary file.
 * @param {object} config - Configuration object
 * @returns {string} Path to the created temp file
 */
export function createTempConfigFile(config) {
  const tempFileName = `${TEMP_DIR_NAME}-config-${randomBytes(16).toString('hex')}.json`;
  const tempFilePath = join(TEMP_DIR_PATH, tempFileName);
  fs.writeFileSync(tempFilePath, JSON.stringify(config));
  trackTempFile(tempFilePath);
  return tempFilePath;
}

/**
 * Merges two configuration objects with deep merge for nested objects.
 * 
 * Merge behavior:
 * - Deep merge for nested objects
 * - Override for primitives and arrays
 * - Null/undefined treated as empty object
 * - Override takes precedence over base
 * 
 * @param {object} base - Base configuration object
 * @param {object} override - Override configuration object
 * @returns {object} Merged configuration object
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
 * Executes the oxlint command via synckit worker.
 * @param {string[]} args - Command line arguments
 * @param {object} options - Execution options
 * @param {string} options.cwd - Working directory
 * @returns {string} Stdout of the command
 */
function executeOxlint(args, options = {}) {
  const cwd = options.cwd || process.cwd();

  const result = executeOxlintWorker({
    binary: oxlintPath,
    args,
    cwd,
  });

  if (result.error) {
    const error = new Error(result.error.message);
    error.code = result.error.code;
    throw error;
  }

  if (result.status !== 0 && result.stderr && !result.stdout) {
    throw new Error(`Oxlint exited with code ${result.status}\nStderr: ${result.stderr}`);
  }

  return result.stdout || '';
}

/**
 * Lint code using oxlint via temp file and synckit worker.
 * @param {string} code - Source code to lint
 * @param {string} filePath - Original file path
 * @param {object} config - Oxlint configuration
 * @returns {object} Lint results with diagnostics array
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
        finalConfig = mergeConfigs(config, fileConfig);
      } catch (e) {
        // Ignore error if config file is invalid, just use inline config
        console.warn('[eslint-plugin-oxlint-x] Invalid config file:', e.message);
      }
    }

    const tempFilePath = createTempFile(code, filePath);
    cleanupTasks.push(() => cleanupTempFile(tempFilePath));

    const cwd = dirname(tempFilePath);
    const args = [
      '--format=json',
      '--no-ignore',
      path.basename(tempFilePath),
    ];

    if (finalConfig && Object.keys(finalConfig).length > 0) {
      const mergedConfigPath = createTempConfigFile(finalConfig);
      cleanupTasks.push(() => cleanupTempFile(mergedConfigPath));
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
 * Format code using oxlint (requires --fix) via synckit worker.
 * @param {string} code - Source code to format
 * @param {string} filePath - Original file path
 * @param {object} config - Oxlint configuration
 * @returns {string} Formatted code
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
        finalConfig = mergeConfigs(config, fileConfig);
      } catch (e) {
        // Ignore invalid config
        console.warn('[eslint-plugin-oxlint-x] Invalid config file:', e.message);
      }
    }

    // Prepare temp file for code
    const tempFilePath = createTempFile(code, filePath);
    cleanupTasks.push(() => cleanupTempFile(tempFilePath));

    const cwd = dirname(tempFilePath);
    const args = ['--fix', path.basename(tempFilePath)];

    if (finalConfig && Object.keys(finalConfig).length > 0) {
      const mergedConfigPath = createTempConfigFile(finalConfig);
      cleanupTasks.push(() => cleanupTempFile(mergedConfigPath));
      args.push('--config', mergedConfigPath);
    } else if (realConfigPath) {
      args.push('--config', realConfigPath);
    }

    executeOxlint(args, { cwd });
    return fs.readFileSync(tempFilePath, 'utf-8');
  } finally {
    for (const task of cleanupTasks) {
      try {
        task();
      } catch { }
    }
  }
}
