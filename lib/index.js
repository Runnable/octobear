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

  static _parseDockerComposeFile (dockerComposeFileString) {
    return Promise.try(() => yaml.safeLoad(dockerComposeFileString))
    .tap(dockerCompose => validate(dockerComposeFileSchema, dockerCompose))
    .then(dockerCompose => dockerCompose.services)
  }

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

  static _getMainName (services) {
    return Object.keys(services)
      .map(key => services[key].build && key)
      .find(key => !!key)
  }

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

  static _removeUnusedKeys (service, warnings) {
    Object.assign(service, {
      warnings: Array.from(warnings), // Convert to array from iterator
      contextVersion: removeNullAndUndefinedKeys(service.contextVersion),
      instance: removeNullAndUndefinedKeys(service.instance)
    })
    return removeNullAndUndefinedKeys(service)
  }

}
