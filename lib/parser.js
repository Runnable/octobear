'use strict'
const path = require('path')
const url = require('url')

module.exports = class Parser {

  /**
   * Parser for `containerStartCommand`
   *
   * @param {Object}                 opts
   * @param {String|Array<String>}   opts.command - Command to be transformed
   * @return {String}                command - Command to be sent to instance
   */
  static commandParser (opts) {
    const command = opts.command
    if (!command) return null
    if (Array.isArray(command)) {
      return command.join(' ')
    }
    return command
  }

  /**
   * Parser for `buildDockerfilePath`
   *
   * @param {Object}          opts
   * @param {String|Object}   opts.build
   * @param {Object}          opts.warnings
   * @return {String|Null}    buildDockerfilePath - Path for docker build
   */
  static buildDockerfilePathParser (opts) {
    const build = opts.build
    const warnings = opts.warnings
    let dockerFileName = 'Dockerfile'
    if (!build) return null

    if (build.args) {
      warnings.add('The `args` argument is not supported for builds. These args will not be passed to the build.', { args: build.args })
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

  /**
   * Parser for `ports`
   *
   * @param {Object}           opts
   * @param {Array<String>}    opts.ports
   * @param {Array<String>}    opts.expose
   * @return {Array<Number>}   ports - Ports to be exposed on container
   */
  static portsParser (opts) {
    const ports = opts.ports || []
    const expose = opts.expose || []
    const warnings = opts.warnings
    const allPorts = ports.concat(expose)
    return allPorts.map(port => {
      if (port.match(/^\d+$/)) {
        return parseInt(port, 10)
      }
      if (port.match(/^\d+:\d+$/)) {
        const ports = port.match(/^(\d+):(\d+)$/)
        if (ports[1] === ports[2]) {
          return parseInt(ports[1], 10)
        }
        warnings.add('An invalid port mapping was added and will be ignored', { ports: [ports[1], ports[2]] })
        return null
      }
      warnings.add('An invalid port was added and will be ignored', { port })
      return null
    })
    .filter(x => !!x)
  }

  /**
   * Parser for environment variables
   *
   * @param {Object}           opts
   * @param {Array<String>}    opts.env
   * @return {Array<String>}   - ENVs for container
   */
  static envParser (opts) {
    const env = opts.env
    return env
  }

  /**
   * Parser for files. Created Dockerfile for non-repo instance
   *
   * @param {Object}         opts
   * @param {String}         opts.image
   * @return {Object|Null}   - Dockerfile for new instance
   */
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

  /**
   * Parser for name. This will be the name for the instance in the UI
   *
   * @param {Object}    opts
   * @param {String}    opts.serviceName
   * @param {String}    opts.repositoryName
   * @return {String}   - New name for instance
   */
  static nameParser (opts) {
    const serviceName = opts.serviceName
    const repositoryName = opts.repositoryName
    return `${repositoryName}-${serviceName}`.replace(/\W/g, '-')
  }

  /**
   * Parser for replacing hostnames in ENVS with new hostnames
   *
   * @param {Object}                  opts
   * @param {Array<String>}           opts.env       - ENVs to be transformed
   * @param {Object<String:String>}   opts.hostnames - All hostnames in cluster with corresponding service name
   * @param {Array<String>}           opts.links     - All links to this container (by service name)
   * @return {Array<String>}          env            - New set of ENVs
   */
  static envReplacementParser (opts) {
    const env = opts.env
    const hostnames = opts.hostnames
    const links = opts.links

    return env.map(env => {
      const match = env.match(/([\w]*)=(.*)$/)
      if (match && match[2]) {
        const envKey = match[1]
        const envValue = match[2]
        // Match exact matches
        if (links.indexOf(envValue) > -1) {
          return `${envKey}=${hostnames[envValue]}`
        }
        // Match parsed urls
        const parsedUrl = url.parse(envValue)
        if (parsedUrl.hostname && links.indexOf(parsedUrl.hostname) > -1) {
          const newHost = hostnames[parsedUrl.hostname]
          const newUrl = url.format({
            protocol: parsedUrl.protocol,
            slashes: parsedUrl.slashes,
            auth: parsedUrl.auth,
            port: parsedUrl.port,
            hostname: newHost,
            hash: parsedUrl.hash,
            search: parsedUrl.search,
            query: parsedUrl.query,
            pathname: parsedUrl.pathname,
            path: parsedUrl.path
          })
          return `${envKey}=${newUrl}`
        }
        // Match host:port
        const hostAndPortRegex = /^(\w*):([0-9]*)$/
        const hostAndPortMatch = envValue.match(hostAndPortRegex)
        if (hostAndPortMatch) {
          const newHost = hostnames[hostAndPortMatch[1]]
          const newEnv = envValue.replace(hostAndPortRegex, `${newHost}:${hostAndPortMatch[2]}`)
          return `${envKey}=${newEnv}`
        }
      }
      return env
    })
  }
}
