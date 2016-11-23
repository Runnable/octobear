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
    let dockerFileName = 'Dockerfile'
    if (!build) return null

    if (build.args) {
      // NOTE: Maybe pass these to the ENVs?
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
    return path.resolve('/', buildPath, dockerFileName)
  }

  static portsParser (opts) {
    const ports = opts.ports
    const warnings = opts.warnings
    if (!ports) return []
    return ports.map(port => {
      if (port.match(/[0-9]*/)) {
        return parseInt(port, 10)
      }
      warnings.push({
        message: 'An invalid port was added and will be ignored',
        port
      })
    })
  }

  static envParser (opts) {
    const env = opts.env
    return env
  }

  static filesParser (opts) {
    const image = opts.image
    if (image) {
      return {
        '/Dockerfile': {
          body:
`# Image automatically created from docker-compose file
FROM ${image}`
        }
      }
    }
    return null
  }

  static nameParser (opts) {
    const serviceName = opts.serviceName
    const repositoryName = opts.repositoryName
    return `${repositoryName}-${serviceName}`.replace(/\W/g, '-')
  }

  static envReplacementParser (opts) {
    const env = opts.env
    const hostnames = opts.hostnames
    const links = opts.links
    const regexes = {}
    const filteredHostnames = Object.keys(hostnames).reduce((obj, key) => {
      if (links.includes(key)) {
        obj[key] = hostnames[key]
      }
      return obj
    }, {})
    Object.keys(filteredHostnames).forEach(oldHost => {
      regexes[oldHost] = [
        // Ports: http://hello:80, postgres://postgres:5460
        new RegExp('([/=@])(' + oldHost + ')([:][0-9]+)', 'ig'),
        // End of line: HELLO=rethinkdb, WOW=great@great.com, COOL=wow/path
        new RegExp('([@=/])(' + oldHost + ')([/]|$)', 'ig')
      ]
    })
    return env.map(env => {
      Object.keys(filteredHostnames).forEach(oldHost => {
        // Replace all instances with the new host
        regexes[oldHost].forEach(regex => {
          env = env.replace(regex, `$1${hostnames[oldHost]}$3`) // only replace 2nd group
        })
      })
      return env
    })
  }
}
