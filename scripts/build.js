const fs = require('fs-extra')
const path = require('path')
const execa = require('execa')

const distDir = path.resolve(process.cwd(), 'dist')
const typesDir = path.resolve(process.cwd(), 'dist/types')

run()

async function run () {
  await fs.remove(distDir)

  await execa('rollup', ['-c', '--configPlugin', 'typescript'], { stdio: 'inherit' })

  const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor')

  const extractorConfigPath = path.resolve(process.cwd(), 'api-extractor.json')
  const extractorConfig = ExtractorConfig.loadFileAndPrepare(
    extractorConfigPath,
  )
  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showVerboseMessages: true,
  })

  if (extractorResult.succeeded) {
    console.log('API Extractor completed successfully.')
  } else {
    console.error(
      `API Extractor completed with ${extractorResult.errorCount} errors` +
        ` and ${extractorResult.warningCount} warnings`,
    )
    process.exitCode = 1
  }

  await fs.remove(typesDir)
}
