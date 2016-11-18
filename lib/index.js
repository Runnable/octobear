'use strict'
const Promise = require('bluebird')
const yaml = require('js-yaml')
const Joi = require('joi')

const removeNullAndUndefinedKeys = require('./util').removeNullAndUndefinedKeys
const validate = require('./util').validate
const parsers = require('./parsers')

const dockerComposeFileSchema = Joi.object({
  version: Joi.string().valid('2').required(),
  services: Joi.object().required()
}).unknown().required()

const arrayOfStrings = Joi.array().items(Joi.string())

const serviceSchemaKeys = {
  build: Joi.alternatives().try(Joi.string(), Joi.object()),
  image: Joi.string(), // TODO: Add parser
  command: Joi.alternatives().try(Joi.string(), arrayOfStrings),
  ports: arrayOfStrings,
  expose: arrayOfStrings, // TODO
  links: arrayOfStrings, // TODO:
  depends_on: arrayOfStrings, // TODO
  environnment: arrayOfStrings
}
const serviceSchema = Joi.object(serviceSchemaKeys).unknown().required()

module.exports = class DockerComposeParser {

  static parse (dockerComposeFileString, dockerComposeFilePath) {
    return Promise.try(() => {
      const dockerCompose = yaml.safeLoad(dockerComposeFileString)
      return validate(dockerComposeFileSchema, dockerCompose)
      .then(dockerCompose => dockerCompose.services)
    })
    .then(services => {
      const results = Promise.map(Object.keys(services), key => {
        return DockerComposeParser._serviceParser(services[key], dockerComposeFilePath)
      })
      return Promise.props({ results })
    })
  }

  static _serviceParser (service, dockerComposeFilePath) {
    const warnings = []
    return validate(serviceSchema, service)
    .then(() => {
      // Throw warning if we have any keys we ignore
      const allowedKeys = Object.keys(serviceSchemaKeys)
      const unsupportedKeys = []
      Object.keys(service).forEach(key => {
        if (allowedKeys.indexOf(key) === -1) {
        }
      })
      warnings.push({
        message: 'The following keys specified in this service are not supported',
        keys: unsupportedKeys
      })
    })
    .then(() => {
      return Promise.props({
        contextVersion: Promise.props({
          advanced: true,
          buildDockerfilePath: parsers.buildDockerfilePathParser({ build: service.build, warnings, dockerComposeFilePath })
        }),
        files: parsers.filesParser({ image: service.image, warnings, dockerComposeFilePath }),
        instance: Promise.props({
          containerStartCommand: parsers.commandParser({ command: service.command, warnings }),
          ports: parsers.portsParser({ ports: service.ports, warnings }),
          // TODO: Will require more work because of links and dependencies
          envs: parsers.envParser({ envs: service.environment, warnings })
        })
      })
    })
    .then(res => {
      res.contextVersion = removeNullAndUndefinedKeys(res.contextVersion)
      res.instance = removeNullAndUndefinedKeys(res.instance)
      res = removeNullAndUndefinedKeys(res)
      return res
    })
  }
}
