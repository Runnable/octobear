'use strict'

const Promise = require('bluebird')
const yaml = require('js-yaml')
const Joi = require('joi')
const hostname = require('@runnable/hostname')

const removeNullAndUndefinedKeys = require('./util').removeNullAndUndefinedKeys
const validate = require('./util').validate
const Parser = require('./parser')
const Mapper = require('./mapper')
const Warning = require('./warning')

const dockerComposeFileSchema = Joi.object({
  version: Joi.string().valid('2').required(),
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
   * @return {Promise}
   * @resolves {Array<Object>}
   */
  static parse (opts) {
    const dockerComposeFileString = opts.dockerComposeFileString
    const repositoryName = opts.repositoryName
    const userContentDomain = opts.userContentDomain
    const ownerUsername = opts.ownerUsername

    return DockerComposeParser._parseDockerComposeFile(dockerComposeFileString)
    .then(services => DockerComposeParser._convertToArrayAndAddMetadata(services))
    .map(service => DockerComposeParser._serviceParser({ service, repositoryName }))
    .map(service => DockerComposeParser._addHostname(service, ownerUsername, userContentDomain))
    .then(services => DockerComposeParser._populateEnvsWithHost(services))
    .then(services => { return { results: services } })
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
   * Convert a services object into an array and add metadata
   *
   * @param {Object<String:Service>} services - Object with service names as key
   * @return {Promise} - Returns new array with services as array
   * @resolves {Array<Object>}
   */
  static _convertToArrayAndAddMetadata (services) {
    const mainServiceName = DockerComposeParser._getMainName(services)
    // Turn into an array
    return Object.keys(services).map(serviceKey => {
      const links = services[serviceKey].links || []
      const dependsOn = services[serviceKey].depends_on || []
      return {
        metadata: {
          name: serviceKey,
          isMain: serviceKey === mainServiceName,
          links: links.concat(dependsOn)
        },
        raw: services[serviceKey]
      }
    })
  }

  /**
   * Adds a hostname to a service
   *
   * @param {Object} service
   * @param {Object} service.metadata      - Metadata object
   * @param {String} service.instance.name - Name of the new instance
   * @return {Object} - Returns same object
   */
  static _addHostname (service, ownerUsername, userContentDomain) {
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
  static _populateEnvsWithHost (services) {
    const hostnames = services.reduce((obj, service) => {
      obj[service.metadata.name] = service.metadata.hostname
      return obj
    }, {})

    return services.map(service => {
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

  /**
   * Get main container for docker compose cluster. Picks the first container
   * with a `build` property.
   *
   * @param {Object<Key:Service>} services - Object with service names as keys and service objects as values
   * @returns {String}
   */
  static _getMainName (services) {
    return Object.keys(services)
      .map(key => services[key].build && key)
      .find(key => !!key)
  }

  /**
   * Parse an individual service
   *
   * @param {Object} service
   * @param {String} repositoryName
   * @return {Promise} - Returns Object with service
   * @resolves {Object}
   */
  static _serviceParser (opts) {
    const service = opts.service
    const repositoryName = opts.repositoryName

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
    .then(rawService => DockerComposeParser._mapRaseServiceToService(service, rawService, repositoryName, warnings))
    .then(service => DockerComposeParser._removeUnusedKeys(service, warnings))
  }

  static _mapRaseServiceToService (service, rawService, repositoryName, warnings) {
    return Promise.props({
      metadata: service.metadata,
      contextVersion: Promise.props({
        advanced: true,
        buildDockerfilePath: Parser.buildDockerfilePathParser({ build: rawService.build, warnings })
      }),
      files: Parser.filesParser({ image: rawService.image, warnings }),
      instance: Promise.props({
        name: Parser.nameParser({ serviceName: service.metadata.name, repositoryName, warnings }),
        containerStartCommand: Parser.commandParser({ command: rawService.command, warnings }),
        ports: Parser.portsParser({ ports: rawService.ports, expose: rawService.expose, warnings }),
        env: Parser.envParser({ env: rawService.environment, warnings })
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
      contextVersion: removeNullAndUndefinedKeys(service.contextVersion),
      instance: removeNullAndUndefinedKeys(service.instance)
    })
    return removeNullAndUndefinedKeys(service)
  }

}
