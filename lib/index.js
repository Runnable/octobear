'use strict'

const Promise = require('bluebird')
const yaml = require('js-yaml')
const Joi = require('joi')
const path = require('path')
const hostname = require('@runnable/hostname')
const dotenv = require('dotenv')
const uniq = require('lodash.uniq')
const validate = require('./util').validate
const Mapper = require('./mapper')
const Parser = require('./parser')
const Warning = require('./warning')

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

const IMAGE_FOR_MISSING_MAIN = process.env.IMAGE_FOR_MISSING_MAIN || 'busybox'

module.exports = class DockerComposeParser {
  /**
   * Parse a docker-compose.yml file into an array of instances that can be
   * used by Runnable API Client
   *
   * @param {Object} opts
   * @param {String} opts.dockerComposeFileString - YML File string
   * @param {String} opts.dockerComposeFilePath - Path to the Compose file
   * @param {String} opts.repositoryName - Name of repository in GH or other service
   * @param {String} opts.userContentDomain - User content domain for API environment. Used for creating hostnames.
   * @param {String} opts.ownerUsername - Organization name in Runnable. Used for creating hostnames.
   * @param {String} opts.scmDomain - Domain for used SCM. E.g. github.com
   * @param {Boolean} opts.skipMissingMainCheck - skip check for missing main
   * @return {Promise}
   * @resolves {Object}          result
   *           {Object[]} result.results         - Array with objects for all services where `inheritance` was resolved by merging
   *           {String[]} result.envFiles        - Array with all required ENV files
   *           {Object}   result.mains           - Main repositories (indexed by service name)
   *           {Object}   result.mains.builds    - Services made in the repo the compose file exists in
   *           {Object}   result.mains.externals - Services made with github links
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
    .then(services => DockerComposeParser._convertToArrayAndAddMetadata(services, dockerComposeFileDirectoryPath))
    .map(service => DockerComposeParser._parseService({ service, repositoryName, scmDomain }))
    .map(service => DockerComposeParser._populateHostname(service, ownerUsername, userContentDomain))
    .then(services => DockerComposeParser._populateEnvsWithHostFromServices(services))
    .then(services => {
      const envFiles = DockerComposeParser._getAllENVFiles(services)
      const mains = DockerComposeParser._getMains(services, opts)
      return { results: services, envFiles, mains }
    })
  }

  /**
   * Parse a list of docker-compose.yml files into an array of services.
   *
   * @param {Object} opts
   * @param {String} opts.repositoryName - Name of repository in GH or other service
   * @param {String} opts.userContentDomain - User content domain for API environment. Used for creating hostnames.
   * @param {String} opts.ownerUsername - Organization name in Runnable. Used for creating hostnames.
   * @param {String} opts.scmDomain - Domain for used SCM. E.g. github.com
   * @param {Object[]} files - Array of files with   `dockerComposeFileString` and `dockerComposeFilePath`
   * @return {Promise}
   * @resolves {Object}          result
   * @resolves {Array<Object>}   result.results  - Array with objects for all services
   * @resolves {Array<String>}   result.envFiles - Array with all required ENV files
   */
  static parseAndMergeMultiple (opts, files) {
    return Promise.map(files, (file) => {
      const newOpts = Object.assign({}, opts, {
        dockerComposeFileString: file.dockerComposeFileString,
        dockerComposeFilePath: file.dockerComposeFilePath,
        skipMissingMainCheck: true
      })
      return DockerComposeParser.parse(newOpts)
    })
    .then((parsedResults) => {
      const allServices = parsedResults.reduce(
        (servs, item) => servs.concat(item.results),
        [])
      return DockerComposeParser._mergeServices(allServices, opts)
    })
  }

  /**
   * Convert array of string envs into the map.
   * @param {String[]} envs
   @return {Object<String>} map of envs. Key is env name , value is env value.
   */
  static _envArrayToMap (envs) {
    return envs.reduce((obj, envStr) => {
      let envArray = envStr.split('=')
      obj[envArray[0]] = envArray[1]
      return obj
    }, {})
  }

  /**
   * Produce new array of envs after the merge of parent and child envs.
   * Child envs override the parents ones.
   * @param {String[]} parentEnvs - Array of envs in format "NAME=VALUE"
   * @param {String[]} childEnvs - Array of envs in format "NAME=VALUE"
   * @return {Array<String>}   merged envs. Array of envs in format "NAME=VALUE"
   */
  static _mergeEnvs (parentEnvs, childEnvs) {
    const parentAsMap = DockerComposeParser._envArrayToMap(parentEnvs || [])
    const childAsMap = DockerComposeParser._envArrayToMap(childEnvs || [])
    const mergedEnvs = Object.assign({}, parentAsMap, childAsMap)
    return Object.keys(mergedEnvs).map((envKey) => {
      const envValue = mergedEnvs[envKey]
      return `${envKey}=${envValue}`
    })
  }

  /**
   * Produce new array or services where extended services were merged with parents
   * @param {Object[]} allServices - Array of services that should be merged
   * @param {Object}  opts
   * @param {Boolean} opts.skipMissingMainCheck - If true, don't add a dummy service for the main
   * @param {String}  opts.repositoryName       - Name of repository in GH or other service
   * @param {String}  opts.userContentDomain    - User content domain for API environment. Used for creating hostnames.
   * @param {String}  opts.ownerUsername        - Organization name in Runnable. Used for creating hostnames.
   * @param {String}  opts.scmDomain            - Domain for used SCM. E.g. github.com
   *
   * @resolves {Object}   result
   *           {Object[]} result.results         - Array with objects for all services where `inheritance` was resolved by merging
   *           {String[]} result.envFiles        - Array with all required ENV files
   *           {Object}   result.mains           - Main repositories (indexed by service name)
   *           {Object}   result.mains.builds    - Services made in the repo the compose file exists in
   *           {Object}   result.mains.externals - Services made with github links
   */
  static _mergeServices (allServices, opts) {
    // services that have extend should be at the end
    const sortedServices = allServices.sort((service) => {
      return (!service.extends || !service.extends.service) ? -1 : 1
    })
    // merge extended services with corresponding parents
    const services = sortedServices.reduce(
      (servs, service) => {
        // if no `extends` just push it to the result and move on
        if (!service.extends || !service.extends.service) {
          servs.push(service)
          return servs
        }
        const existingServiceIndex = servs.findIndex((s) => {
          return (s.metadata.name === service.extends.service) ||
            (s.metadata.name === service.metadata.name)
        })
        if (existingServiceIndex > -1) {
          const existingService = servs[existingServiceIndex]
          const mergedService = Object.assign({}, existingService, service)
          const mergedEnvs = DockerComposeParser._mergeEnvs(existingService.instance.env, service.instance.env)
          mergedService.instance.env = mergedEnvs

          servs[existingServiceIndex] = mergedService
        } else {
          const warnings = new Warning()
          warnings.add('Parent service is not found', {
            serviceName: service.metadata.name,
            parentServiceName: service.extends.service
          })
          service.warnings = warnings
          servs.push(service)
        }
        return servs
      },
      []
    )
    const envFiles = DockerComposeParser._getAllENVFiles(services)
    const mains = DockerComposeParser._getMains(services, opts)
    return { results: services, envFiles, mains }
  }

  /**
   * Parse a docker-compose.yml file into an array of file paths to
   * other compose files.
   *
   * @param {String} dockerComposeFileString - YML File string
   * @return {Promise}
   * @resolves {Array<String>} filePaths - Array of file paths
   */
  static findExtendedFiles (dockerComposeFileString) {
    return DockerComposeParser._parseDockerComposeFile(dockerComposeFileString)
    .then(services => {
      return Object.keys(services).map(serviceKey => {
        const service = services[serviceKey]
        if (service.extends) {
          return service.extends.file
        }
        return null
      })
    })
    .filter(filePath => !!filePath)
    .then(uniq)
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
   * Adds a main service if one doesn't already exist to the mains.builds object, and adds it to the services array
   *
   * @param {Service[]} services                  - Array of services
   * @param {Object}    mains                     - Object containing all of the main builds and externals
   * @param {Object}    mains.externals           - All services with external (github) builds (indexed by name)
   * @param {Object}    mains.builds              - All services with local builds (same repo as compose file) (indexed by name)
   * @param {Object}    opts
   * @param {String}    opts.repositoryName       - Name of repository in GH or other service
   * @param {String}    opts.userContentDomain    - User content domain for API environment. Used for creating hostnames.
   * @param {String}    opts.ownerUsername        - Organization name in Runnable. Used for creating hostnames.
   * @param {String}    opts.scmDomain            - Domain for used SCM. E.g. github.com
   * @private
   */
  static addMainIfMissing (services, mains, opts) {
    if (!Object.keys(mains.builds).length && !Object.keys(mains.externals).length) {
      const repositoryName = opts.repositoryName
      const userContentDomain = opts.userContentDomain
      const ownerUsername = opts.ownerUsername
      const newMainService = {
        metadata: {
          name: repositoryName,
          isMain: true,
          envFiles: [],
          isMissingMaster: true
        },
        files: Parser.filesParser({ image: IMAGE_FOR_MISSING_MAIN }),
        instance: {
          name: repositoryName,
          env: []
        }
      }
      DockerComposeParser._populateHostname(newMainService, ownerUsername, userContentDomain)
      services.push(newMainService)
      mains.builds[repositoryName] = (newMainService)
    }
  }

  /**
   * Convert a services object into an array and add metadata
   *
   * @param {Object<String:Service>} services - Object with service names as key
   * @param {String}                 dockerComposeFileDirectoryPath
   * @return {Array<Object>}
   */
  static _convertToArrayAndAddMetadata (services, dockerComposeFileDirectoryPath) {
    // Turn into an array
    return Object.keys(services).map(serviceKey => {
      const service = services[serviceKey]
      const links = Parser.linksParser({ links: service.links })
      const dependsOn = services[serviceKey].depends_on || []
      const envFiles = Parser.envFileParser({ env_file: service.env_file, dockerComposeFileDirectoryPath })
      return {
        metadata: {
          name: serviceKey,
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
   * @param {Array<Object>} services
   * @param {String} services.metadata.hostname - Hostname for instance
   * @param {Array<String>} services.metadata.links - Links to other services
   * @param {Array<String>} services.instance.env - ENVs for new instance
   * @return {Array<Object>} - Returns array with transformed objects
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
   * Get main containers for docker compose cluster. Gets all of the builds and all of the externals (github
   * repo urls) and returns them in an object keyed by the service name
   *
   * @param {Service[]} services                  - Object with service names as keys and service objects as values
   * @param {Object}    opts                      - Options for building these services
   * @param {Boolean}   opts.skipMissingMainCheck - If true, don't add a dummy service for the main
   * @returns {Object} mains
   *          {Object} mains.builds
   *          {Object} mains.externals
   */
  static _getMains (services, opts) {
    const mains = services
      .filter(service => !!service.build)
      .reduce((buildLists, service) => {
        const name = service.metadata.name
        const codeObj = service.code
        if (codeObj && codeObj.repo) {
          buildLists.externals[name] = service
        } else {
          buildLists.builds[name] = service
        }
        return buildLists
      }, { builds: {}, externals: {} })
    if (!opts.skipMissingMainCheck) {
      DockerComposeParser.addMainIfMissing(services, mains, opts)
    }
    return mains
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
      extends: rawService.extends,
      build: Parser.dockerBuildParser({ build: rawService.build, scmDomain, warnings }),
      code: Parser.buildRemoteCodeParser({ build: rawService.build, scmDomain, warnings }),
      files: Parser.filesParser({ image: rawService.image }),
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
      (serviceENVFiles || []).forEach(filePath => {
        obj[filePath] = true
      })
      return obj
    }, {})
    return Object.keys(filesObj)
  }
}
