const execa = require('execa')
const os = require('os')

run()

async function run () {
  const dockerArgs = [
    'run',
    '--name',
    'jamcaa-mysql',
    '-e',
    'MYSQL_USER=jamcaa',
    '-e',
    'MYSQL_PASSWORD=jamcaa',
    '-e',
    'MYSQL_DATABASE=test',
    '-e',
    'MYSQL_ROOT_PASSWORD=root',
    '-p',
    '6603:3306',
    '-d',
  ]

  if (['arm', 'arm64'].includes(os.arch())) {
    dockerArgs.push('--platform', 'linux/x86_64')
  }

  dockerArgs.push('mysql:5.7')

  await execa('docker', dockerArgs)
}
