import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const oxlintPath = join(__dirname, '..', 'node_modules', 'oxlint', 'bin', 'oxlint');

function getRandomFileName(originalPath) {
  const extension = originalPath.slice(originalPath.lastIndexOf('.'));
  return `.oxlint-temp-${randomBytes(16).toString('hex')}${extension}`;
}

/**
 * Create temporary files for oxlint processing
 * @param {string} code - Source code
 * @param {string} filePath - Original file path
 * @param {object} config - Oxlint configuration
 * @returns {Promise<{codePath: string, configPath: string}>}
 */
async function createTempFiles(code, filePath, config) {


  const hasConfig = config && JSON.stringify(config) !== '{}'

  const tempDir = dirname(filePath);
  const tempFileName = getRandomFileName(filePath);
  const codePath = join(tempDir, tempFileName);

  const configPath = hasConfig ? '' : join(tempDir, `.oxlintrc.${tempFileName}.json`);

  await fs.writeFile(codePath, code);
  if (hasConfig) {
    await fs.writeFile(configPath, JSON.stringify(config));
  }

  return { codePath, configPath };
}

/**
 * Clean up temporary files
 * @param {string} codePath - Path to temporary code file
 * @param {string} configPath - Path to temporary config file
 * @returns {Promise<void>}
 */
async function cleanupTempFiles(codePath, configPath) {

  console.log([codePath, configPath]);
  
  const filesToClean = [codePath, configPath].filter(Boolean);

  if (filesToClean.length === 0) return;

  const results = await Promise.allSettled(filesToClean.map(path => fs.unlink(path)));

  // Log failures but don't throw
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`Failed to clean up ${filesToClean[index]}: ${result.reason.message}`);
    }
  });
}

async function findNearestOxlintrc(startPath) {
  let currentDir = dirname(startPath);
  while (true) {
    const configPath = join(currentDir, '.oxlintrc.json');
    try {
      await fs.access(configPath);
      return configPath;
    } catch {
      // Not found, go up
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null; // Reached root
    }
    currentDir = parentDir;
  }
}

/**
 * Merge configurations with proper priority and deep merge
 * @param {object} optionsConfig - Configuration from ESLint rule options
 * @param {object} fileConfig - Configuration from .oxlintrc.json
 * @returns {object} - Merged configuration with file config taking priority
 */
export function mergeConfigs(optionsConfig, fileConfig) {
  // Handle null and undefined configurations
  if (!optionsConfig && !fileConfig) return {};
  if (!optionsConfig) return { ...fileConfig };
  if (!fileConfig) return { ...optionsConfig };

  // Start with optionsConfig as base
  const merged = { ...optionsConfig };

  // Deep merge for nested objects, fileConfig has priority
  for (const key in fileConfig) {
    if (fileConfig[key] && typeof fileConfig[key] === 'object' && !Array.isArray(fileConfig[key])) {
      // Deep merge for nested objects
      merged[key] = {
        ...(merged[key] || {}),
        ...fileConfig[key],
      };
    } else {
      // Direct override for primitives and arrays
      merged[key] = fileConfig[key];
    }
  }

  return merged;
}

/**
 * @param {string} code
 * @param {string} filePath
 * @param {object} options
 * @returns {Promise<string>}
 */
export async function format(code, filePath, options = {}) {
  const realConfigPath = await findNearestOxlintrc(filePath);
  let fileConfig = {};
  if (realConfigPath) {
    try {
      fileConfig = JSON.parse(await fs.readFile(realConfigPath, 'utf-8'));
    } catch {
      /* ignore parse errors */
    }
  }

  const mergedConfig = mergeConfigs(options, fileConfig);


  let tempFilePath = null;
  let tempConfigPath = null;

  try {
    // Create temporary files
    const tempFiles = await createTempFiles(code, filePath, mergedConfig);
    tempFilePath = tempFiles.codePath;
    tempConfigPath = tempFiles.configPath;

    // Run oxlint
    const fixedCode = await new Promise((resolve, reject) => {



      const args = ['--fix', '--config', tempConfigPath, tempFilePath];

      if (mergedConfig['deny-warnings']) {
        args.push('--deny-warnings');
      }

      const process = spawn(oxlintPath, args, {
        stdio: 'inherit',
      });

      process.on('close', async () => {
        try {
          const fixedCode = await fs.readFile(tempFilePath, 'utf-8');
          resolve(fixedCode);
        } catch (error) {
          reject(error);
        }
      });

      process.on('error', error => {
        reject(error);
      });
    });

    return fixedCode;
  } finally {
    // Always clean up temporary files
    await cleanupTempFiles(tempFilePath, tempConfigPath);
  }
}
