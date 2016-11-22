'use strict'
const fs = require('fs')
const path = require('path')

module.exports.sanitizeName = x => x.replace(/[^a-zA-Z0-9-]/g, '-')

module.exports.getDockerFile = (repo) => {
  const dockerComposeFilePath = path.join(__dirname, `repos/${repo}/docker-compose.yml`)
  const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
  return { dockerComposeFilePath, dockerComposeFileString }
}
