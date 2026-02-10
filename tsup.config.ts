import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.js', 'src/oxlint-worker.js'],
  format: ['cjs', 'esm'],
  clean: true,
  dts: true,
  splitting: false,
  shims: true,
})
