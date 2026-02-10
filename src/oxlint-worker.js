import { runAsWorker } from 'synckit';
import { spawnSync } from 'node:child_process';

/**
 * Worker function that executes Oxlint binary synchronously.
 * This worker is invoked via synckit's worker_threads mechanism.
 * 
 * @param {Object} params - Execution parameters
 * @param {string} params.binary - Path to the oxlint binary
 * @param {string[]} params.args - Command line arguments for oxlint
 * @param {string} params.cwd - Working directory for execution
 * @returns {Promise<Object>} Execution result with stdout, stderr, status, and error
 */
runAsWorker(async ({ binary, args, cwd }) => {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
    error: result.error ? {
      message: result.error.message,
      code: result.error.code,
    } : null,
  };
});
