'use strict'
const fs = require('fs')
const path = require('path')
module.exports.sanitizeName = x => x.replace(/[^a-zA-Z0-9-]/g, '-')

module.exports.getDockerFile = (repo) => {
  const dockerComposeFilePath = module.exports.getDockerComposePath(repo)
  const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
  return { dockerComposeFilePath, dockerComposeFileString }
}

module.exports.getDockerComposePath = (repo) => {
  return path.join(__dirname, `repos/${repo}/docker-compose.yml`)
}

module.exports.getAllENVFiles = (filePaths, repo) => {
  return filePaths.reduce((obj, partialFilePath) => {
    let filePath = path.join(__dirname, `repos/${repo}/${partialFilePath}`)
    obj[partialFilePath] = fs.readFileSync(filePath).toString()
    return obj
  }, {})
}
