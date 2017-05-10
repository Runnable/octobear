'use strict'
const path = require('path')

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
   * Parser for `envFiles`
   *
   * @param {Object}                 opts
   * @param {String|Array<String>}   opts.env_file - Command to be transformed
   * @return {String}                command - Command to be sent to instance
   */
  static envFileParser (opts) {
    const envFile = opts.env_file
    const dockerComposeFileDirectoryPath = opts.dockerComposeFileDirectoryPath
    let arrayOfEnvFilePaths = []
    if (typeof envFile === 'string') {
      arrayOfEnvFilePaths = [envFile]
    } else if (Array.isArray(envFile) && envFile.length > 0) {
      arrayOfEnvFilePaths = envFile
    } else {
      arrayOfEnvFilePaths = []
    }
    return arrayOfEnvFilePaths.map(s => path.join(dockerComposeFileDirectoryPath, s))
  }

  /**
   * Check if `path` is has `scmDomain`
   *
   * @param {String}      scmDomain
   * @param {String}      path
   * @return {Boolean}    true if path is github URL
   */
  static isScmUrl (scmDomain, path) {
    return path.indexOf(scmDomain) > -1
  }

  /**
   * Parser for `dockerFilePath` and `dockerBuildContext`
   *
   * @param {Object}          opts
   * @param {String|Object}   opts.build
   * @param {String|Object}   opts.scmDomain
   * @param {Object}          opts.warnings
   * @return {Object|Null}    object with  `dockerFilePath` and `dockerBuildContext` props
   */
  static dockerBuildParser (opts) {
    const build = opts.build
    const warnings = opts.warnings
    const scmDomain = opts.scmDomain
    if (!build || build.disabled) return null
    let dockerFileName = 'Dockerfile'
    if (build.args) {
      warnings.add('The `args` argument is not supported for builds. These args will not be passed to the build.', { args: build.args })
    }

    let dockerContextPath
    if (typeof build === 'string') {
      dockerContextPath = build
    } else {
      dockerContextPath = build.context
      if (build.dockerfile) {
        dockerFileName = build.dockerfile
      }
    }
    // API only takes repo names without .git
    dockerContextPath = dockerContextPath.replace(/\.git/, '')
    // if path has SCM domain name than we ignore it when creating path or Docker file
    if (Parser.isScmUrl(scmDomain, dockerContextPath)) {
      return {
        dockerFilePath: path.resolve('/', dockerFileName)
      }
    }
    const dockerFilePath = path.resolve('/', dockerContextPath, dockerFileName)
    return {
      dockerFilePath,
      dockerBuildContext: dockerContextPath
    }
  }

  /**
   * Parser for `code`
   *
   * @param {Object}          opts
   * @param {String|Object}   opts.build
   * @param {String|Object}   opts.scmDomain
   * @param {Object}          opts.warnings
   * @return {Object|Null}    code object with `repo` and `commitish` which can be null.
   */
  static buildRemoteCodeParser (opts) {
    const build = opts.build
    const warnings = opts.warnings
    const scmDomain = opts.scmDomain
    if (!build || build.disabled) return null

    if (build.args) {
      warnings.add('The `args` argument is not supported for builds. These args will not be passed to the build.', { args: build.args })
    }

    let buildPath = (typeof build === 'string') ? build : build.context
    if (!Parser.isScmUrl(scmDomain, buildPath)) {
      return
    }
    // API only takes repo names without .git
    buildPath = buildPath.replace(/\.git/, '')
    const githubUrlTokens = buildPath.split(scmDomain)
    const repoPath = githubUrlTokens[1]
    const repoPathClean = repoPath.substr(1)
    const repoAndShaTokens = repoPathClean.split('#')
    const repo = repoAndShaTokens[0]
    const commitish = repoAndShaTokens.length > 1 ? repoAndShaTokens[1] : null
    return { repo, commitish }
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
   * Convert a link string into an object with serviceName and all aliases
   *
   *
   * @param {String}
   * @return {Object}          res             - Object with link object
   * @return {Object}          res.serviceName - Link service name
   * @return {Array<String>}   res.aliases     - Link aliases
   */
  static convertLinkStringToObject (link) {
    const splits = link.split(':')
    if (splits.length === 1) {
      return {
        serviceName: splits[0],
        aliases: [splits[0]]
      }
    }
    return {
      serviceName: splits[0],
      aliases: splits
    }
  }

  /**
   * Parse a link string to only get the service names and remove aliases
   *
   * @param {Object}           opts
   * @param {Array<String>}    opts.links - Strings with all links
   * @return {Array<String>}              - Strings with all links (no aliases)
   */
  static linksParser (opts) {
    const links = opts.links
    if (!Array.isArray(links)) return []
    return links.map(link => Parser.convertLinkStringToObject(link).serviceName)
  }

  /**
   * Parse an array of links in to a key/value pairs with aliases and service names
   *
   * @param {Object}                   opts
   * @param {Array<String>}            opts.links - Instance links
   * @return {Object<String:String>}              - Key/Value pairs for aliases and its service name
   */
  static aliasParser (opts) {
    const links = opts.links
    if (!links) return {}
    const parsedLinks = links.map(link => Parser.convertLinkStringToObject(link))
    return parsedLinks.reduce((obj, link) => {
      link.aliases.forEach(alias => {
        obj[alias] = link.serviceName
      })
      return obj
    }, {})
  }

  /**
   * Replace service key (from compose file) with instance name
   *
   * @param {Object}    opts
   * @param {Object}    opts.aliases         - Key/values for aliases and their respective service names
   * @param {Object}    opts.servicesNameMap - Key/values for service names and their respective instance names
   * @return {Object}                        - Key/value for aliases with their respective instance names
   */
  static aliasInstanceNameReplacer (opts) {
    const aliases = Object.assign({}, opts.aliases)
    const servicesNameMap = opts.servicesNameMap
    return Object.keys(aliases).reduce((obj, key) => {
      let serviceName = aliases[key]
      let base64String = new Buffer(key).toString('base64')
      obj[base64String] = {
        alias: key,
        instanceName: servicesNameMap[serviceName]
      }
      return obj
    }, {})
  }
}
