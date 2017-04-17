'use strict'
const fs = require('fs')
const path = require('path')
module.exports.sanitizeName = x => x.replace(/[^a-zA-Z0-9-]/g, '-')

module.exports.getDockerFile = (repo) => {
  const dockerComposeFilePath = module.exports.getDockerComposeDefaultPath(repo)
  const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
  return { dockerComposeFilePath, dockerComposeFileString }
}

module.exports.getComposeFile = (repo, composePath) => {
  const dockerComposeFilePath = module.exports.getDockerComposePath(repo, composePath)
  const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
  return { dockerComposeFilePath, dockerComposeFileString }
}

module.exports.getDockerComposePath = (repo, composePath) => {
  return path.join(__dirname, `repos/${repo}/${composePath}`)
}
module.exports.getDockerComposeDefaultPath = (repo) => {
  return module.exports.getDockerComposePath(repo, 'docker-compose.yml')
}

module.exports.getAllENVFiles = (filePaths, repo, overwritePath) => {
  return filePaths.reduce((obj, partialFilePath) => {
    let filePath
    if (overwritePath) {
      filePath = path.join(__dirname, `${overwritePath}/${partialFilePath}`)
    } else {
      filePath = path.join(__dirname, `repos/${repo}/${partialFilePath}`)
    }

    obj[partialFilePath] = fs.readFileSync(filePath).toString()
    return obj
  }, {})
}
