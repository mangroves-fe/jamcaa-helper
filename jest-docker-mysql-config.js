const { defineConfig } = require('@mangroves/jest-docker-mysql')

module.exports = defineConfig({
  executeSqlForEachTestSuite: false,
})
