import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [
    typescript({
      declaration: true,
      declarationDir: 'dist/types',
      rootDir: './src',
      outDir: './dist',
      exclude: ['**/*.spec.ts'],
    }),
    nodeResolve(),
    commonjs(),
  ],
  external: ['typeorm'],
})
