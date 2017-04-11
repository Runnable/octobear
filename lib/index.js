'use strict'

const Promise = require('bluebird')
const yaml = require('js-yaml')
const Joi = require('joi')
const path = require('path')
const hostname = require('@runnable/hostname')
const dotenv = require('dotenv')

const validate = require('./util').validate
const Mapper = require('./mapper')
const Parser = require('./parser')
const Warning = require('./warning')

const GITHUB_REGEX = /github\.com/

const dockerComposeFileSchema = Joi.object({
  version: Joi.string().regex(/^(2|3)(\.\d*)?$/).required(),
  services: Joi.object().required()
}).unknown().required()

const arrayOfStrings = Joi.array().items(Joi.string())

const serviceSchemaKeys = {
  build: Joi.alternatives().try(Joi.string(), Joi.object()),
  image: Joi.string(),
  command: Joi.alternatives().try(Joi.string(), arrayOfStrings),
  ports: arrayOfStrings,
  expose: arrayOfStrings,
  links: arrayOfStrings,
  depends_on: arrayOfStrings,
  environment: Joi.alternatives().try(Joi.object(), arrayOfStrings)
}
const serviceSchema = Joi.object(serviceSchemaKeys).unknown().required()

module.exports = class DockerComposeParser {

  /**
   * Parse a docker-compose.yml file into an array of instances that can be
   * used by Runnable API Client
   *
   * @param {Object} opts
   * @param {String} opts.dockerComposeFileString - YML File string
   * @param {String} opts.repositoryName - Name of repository in GH or other service
   * @param {String} opts.userContentDomain - User content domain for API environment. Used for creating hostnames.
   * @param {String} opts.ownerUsername - Organization name in Runnable. Used for creating hostnames.
   * @param {String} opts.scmDomain - Domain for used SCM. E.g. github.com
   * @return {Promise}
   * @resolves {Object}          result
   * @resolves {Array<Object>}   result.results  - Array with objects for all services
   * @resolves {Array<String>}   result.envFiles - Array with all required ENV files
   */
  static parse (opts) {
    const dockerComposeFileString = opts.dockerComposeFileString
    const dockerComposeFilePath = opts.dockerComposeFilePath || './docker-compose.yml'
    const dockerComposeFileDirectoryPath = path.dirname(dockerComposeFilePath)
    const repositoryName = opts.repositoryName
    const userContentDomain = opts.userContentDomain
    const ownerUsername = opts.ownerUsername
    const scmDomain = opts.scmDomain

    return DockerComposeParser._parseDockerComposeFile(dockerComposeFileString)
    .tap(services => DockerComposeParser._checkIfMissingMain(services, repositoryName))
    .then(services => DockerComposeParser._convertToArrayAndAddMetadata(services, dockerComposeFileDirectoryPath))
    .map(service => DockerComposeParser._parseService({ service, repositoryName, scmDomain }))
    .map(service => DockerComposeParser._populateHostname(service, ownerUsername, userContentDomain))
    .then(services => DockerComposeParser._populateEnvsWithHostFromServices(services))
    .then(services => {
      const envFiles = DockerComposeParser._getAllENVFiles(services)
      return { results: services, envFiles }
    })
  }

  /**
   * Append ENVs found in ENV files
   *
   * @param {Array<Object>}   services                   - Array of services provided by `parse`
   * @param {Array<String>}   services.metadata.envFiles - Array of filepaths for ENV files
   * @param {Array<String>}   services.metadata.links    - Array of services servicies is linked to
   * @param {Array<String>}   services.instance.env      - Array of ENVs service currently has
   * @param {Object}          envFilesMap                - Object with filename as key and file contents as value loaded files from `parse` in `.envFiles`
   * @return {Promise}
   * @resolves {Array<Object>} - Array with objects for all services
   */
  static populateENVsFromFiles (services, envFilesMap) {
    const filesAsEnvs = Object.keys(envFilesMap).reduce((obj, key) => {
      obj[key] = dotenv.parse(envFilesMap[key])
      return obj
    }, {})
    const hostnames = DockerComposeParser._getHostnamesForServices(services)
    return Promise.resolve(services).map(service => {
      service = Object.assign({}, service)
      const env = service.metadata.envFiles.reduce((arr, envFilePath) => {
        let newEnvs = []
        if (filesAsEnvs[envFilePath]) {
          newEnvs = Object.keys(filesAsEnvs[envFilePath]).reduce((arr, key) => {
            return arr.concat([`${key}=${filesAsEnvs[envFilePath][key]}`])
          }, [])
        }
        return arr.concat(newEnvs)
      }, [])
      if (!Array.isArray(service.instance.env)) {
        service.instance.env = []
      }
      service.instance.env = service.instance.env.concat(Parser.envReplacementParser({
        env,
        links: service.metadata.links,
        hostnames
      }))
      delete service.metadata.envFiles
      return service
    })
  }

  /**
   * Turn some YML into a JS object
   *
   * @param {String} dockerComposeFileString - YML File string
   *
   * @return {Promise}
   * @resolves {Array<Object>}
   * @throw {Error} - Throw error if the string is not valid YML or if there is any validation errors
   */
  static _parseDockerComposeFile (dockerComposeFileString) {
    return Promise.try(() => yaml.safeLoad(dockerComposeFileString))
    .tap(dockerCompose => validate(dockerComposeFileSchema, dockerCompose))
    .then(dockerCompose => dockerCompose.services)
  }

  /**
   * Adds a main service if one doesn't already exist
   *
   * @param {Object<String:Service>} services - Object with service names as key
   * @param {String}                 repoName - name of the repo
   * @private
   */
  static _checkIfMissingMain (services, repoName) {
    const mainServiceName = DockerComposeParser._getMainName(services)
    if (!mainServiceName) {
      services[repoName] = {
        build: {
          disabled: true
        },
        image: 'busybox'
      }
    }
  }

  /**
   * Convert a services object into an array and add metadata
   *
   * @param {Object<String:Service>} services - Object with service names as key
   * @return {Promise} - Returns new array with services as array
   * @resolves {Array<Object>}
   */
  static _convertToArrayAndAddMetadata (services, dockerComposeFileDirectoryPath) {
    const mainServiceName = DockerComposeParser._getMainName(services)
    // Turn into an array
    return Object.keys(services).map(serviceKey => {
      const service = services[serviceKey]
      const links = Parser.linksParser({ links: service.links })
      const dependsOn = services[serviceKey].depends_on || []
      const envFiles = Parser.envFileParser({ env_file: service.env_file, dockerComposeFileDirectoryPath })
      return {
        metadata: {
          name: serviceKey,
          isMain: serviceKey === mainServiceName,
          links: links.concat(dependsOn),
          envFiles
        },
        raw: service
      }
    })
  }

  /**
   * Populates the hostname for a service
   *
   * @param {Object} service
   * @param {Object} service.metadata      - Metadata object
   * @param {String} service.instance.name - Name of the new instance
   * @return {Object} - Returns same object
   */
  static _populateHostname (service, ownerUsername, userContentDomain) {
    service.metadata.hostname = hostname.elastic({
      shortHash: '000', // This is required, but ignored
      instanceName: service.instance.name,
      ownerUsername,
      masterPod: true,
      userContentDomain
    })
    return service
  }

  /**
   * Populates all services with host. Does replacement of ENVs
   *
   * @param {Array<Service>} services
   * @param {String} services.metadata.hostname - Hostname for instance
   * @param {Array<String>} services.metadata.links - Links to other services
   * @param {Array<String>} services.instance.env - ENVs for new instance
   * @return {Array<Service>} - Returns array with transformed objects
   */
  static _populateEnvsWithHostFromServices (services) {
    const hostnames = DockerComposeParser._getHostnamesForServices(services)
    const servicesNameMap = services.reduce((obj, service) => {
      obj[service.metadata.name] = service.instance.name
      return obj
    }, {})

    return services.map(service => {
      service.instance.aliases = Parser.aliasInstanceNameReplacer({ aliases: service.instance.aliases, servicesNameMap })
      if (service.instance.env) {
        service.instance.env = Parser.envReplacementParser({
          env: service.instance.env,
          links: service.metadata.links,
          hostnames
        })
      }
      return service
    })
  }

  static _getHostnamesForServices (services) {
    return services.reduce((obj, service) => {
      obj[service.metadata.name] = service.metadata.hostname
      return obj
    }, {})
  }

  /**
   * Get main container for docker compose cluster. Picks the first container
   * with a `build` property that isn't from github, unless it only has github, then it picks that first one
   *
   * @param {Object<Key:Service>} services - Object with service names as keys and service objects as values
   * @returns {String||Undefined} Returns the key name of the main instance, or undefined if it's not there
   */
  static _getMainName (services) {
    const buildLists = Object.keys(services)
      .filter(key => !!services[key].build)
      .reduce((buildLists, key) => {
        const buildObj = services[key].build
        if (typeof (buildObj) === 'string' && GITHUB_REGEX.test(buildObj)) {
          buildLists.links.push(key)
        } else {
          buildLists.builds.push(key)
        }
        return buildLists
      }, { builds: [], links: [] })

    if (buildLists.builds.length) {
      return buildLists.builds[0]
    } else if (buildLists.links.length) {
      return buildLists.links[0]
    }
  }

  /**
   * Parse an individual service
   * @param {Object} opts - options for parsing
   * @param {Object} opts.service
   * @param {String} opts.repositoryName
   * @param {String} opts.scmDomain - Domain for used SCM. E.g. github.com
   * @return {Promise} - Returns Object with service
   * @resolves {Object}
   */
  static _parseService (opts) {
    const service = opts.service
    const repositoryName = opts.repositoryName
    const scmDomain = opts.scmDomain

    const rawService = service.raw
    const warnings = new Warning()

    return validate(serviceSchema, rawService)
    // Map raw properties
    .then(() => {
      rawService.environment = Mapper.mapKeyValueObjectToArray(rawService.environment)
      return rawService
    })
    // Populate Warnings
    .then(rawService => Warning.unsupportedKeys(rawService, warnings, serviceSchemaKeys))
    .then(rawService => Warning.buildAndImage(rawService, warnings))
    // Populate properties
    .then(rawService => DockerComposeParser._mapRawServiceToService(service, rawService, repositoryName, scmDomain, warnings))
    .then(service => DockerComposeParser._removeUnusedKeys(service, warnings))
  }

  static _mapRawServiceToService (service, rawService, repositoryName, scmDomain, warnings) {
    return Promise.props({
      metadata: service.metadata,
      buildDockerfilePath: Parser.buildDockerfilePathParser({ build: rawService.build, scmDomain, warnings }),
      buildDockerContext: Parser.buildDockerContextParser({ build: rawService.build, scmDomain, warnings }),
      code: Parser.buildRemoteCodeParser({ build: rawService.build, scmDomain, warnings }),
      files: Parser.filesParser({ image: rawService.image, warnings }),
      instance: Promise.props({
        name: Parser.nameParser({ serviceName: service.metadata.name, repositoryName, warnings }),
        containerStartCommand: Parser.commandParser({ command: rawService.command, warnings }),
        ports: Parser.portsParser({ ports: rawService.ports, expose: rawService.expose, warnings }),
        env: Parser.envParser({ env: rawService.environment, warnings }),
        aliases: Parser.aliasParser({ links: rawService.links }) // Partial parsing
      })
    })
  }

  /**
   * Remove all unused keys from service and add warnings to response
   *
   * @return {Object} service
   * @return {Object} - Same objected, transformed
   */
  static _removeUnusedKeys (service, warnings) {
    Object.assign(service, {
      warnings: Array.from(warnings), // Convert to array from iterator
      code: Mapper.removeNullAndUndefinedKeys(service.code),
      instance: Mapper.removeNullAndUndefinedKeys(service.instance)
    })
    return Mapper.removeNullAndUndefinedKeys(service)
  }

  /**
   * Get all file paths for ENV files and return them as an array
   *
   * @param {Array<Object>}   services
   * @param {Array<String>}   services.metadata.envFiles - Array of strings with filepaths
   * @return {Array<String>}
   */
  static _getAllENVFiles (services) {
    const filesForAllServices = services.map(x => x.metadata.envFiles)
    const filesObj = filesForAllServices.reduce((obj, serviceENVFiles) => {
      serviceENVFiles.forEach(filePath => {
        obj[filePath] = true
      })
      return obj
    }, {})
    return Object.keys(filesObj)
  }

}
