'use strict'
const path = require('path')

module.exports = class Parser {

  static commandParser (opts) {
    const command = opts.command
    if (!command) return null
    if (Array.isArray(command)) {
      return command.join(' ')
    }
    return command
  }

  static buildDockerfilePathParser (opts) {
    const build = opts.build
    const warnings = opts.warnings
    const dockerComposeFilePath = opts.dockerComposeFilePath || '/'
    let dockerFileName = 'Dockerfile'

    if (build.args) {
      // TODO: Maybe pass these to the ENVs?
      warnings.push({
        message: 'The `args` argument is not supported for builds. These args will not be passed to the build.',
        args: build.args
      })
    }

    let buildPath
    if (typeof build === 'string') {
      buildPath = build
    } else {
      buildPath = build.context
      if (build.dockerfile) {
        dockerFileName = build.dockerfile
      }
    }
    return path.resolve(dockerComposeFilePath, buildPath, dockerFileName)
  }

  static portsParser (opts) {
    const ports = opts.ports
    // const warnings = opts.warnings
    if (!ports) return []
    return ports.map(port => {
      if (port.match(/[0-9]*/)) {
        return parseInt(port, 10)
      }
    })
  }

  static envParser (opts) {
    const envs = opts.envs
    return envs
  }

  static filesParser (opts) {
    // const image = opts.image
    return null
  }
}
