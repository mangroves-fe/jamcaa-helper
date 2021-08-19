module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '@mangroves/jest-docker-mysql/lib/setup-after-env.js',
  ],
  globalSetup: '@mangroves/jest-docker-mysql/lib/global-setup.js',
  globalTeardown: '@mangroves/jest-docker-mysql/lib/global-teardown.js',
}
