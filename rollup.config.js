import { defineConfig } from 'rollup'
import path from 'path'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default defineConfig(() => {
  return {
    input: path.resolve(process.cwd(), 'src/index.ts'),
    output: {
      dir: path.resolve(process.cwd(), 'bin'),
      format: 'cjs',
    },
    plugins: [
      typescript(),
      nodeResolve(),
      commonjs(),
    ],
  }
})
