'use strict'
const Promise = require('bluebird')
const yaml = require('js-yaml')
const Joi = require('joi')

const removeNullAndUndefinedKeys = require('./util').removeNullAndUndefinedKeys
const validate = require('./util').validate
const Parser = require('./parser')
const Warning = require('./warning')

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
  environment: arrayOfStrings
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
      return Promise.resolve([service, warnings])
      .spread((service, warnings) => {
        return Warning.unsupportedKeys(service, warnings, serviceSchemaKeys)
      })
      .spread((service, warnings) => {
        return Warning.buildAndImage(service, warnings)
      })
    })
    .spread((service, warnings) => {
      const res = Promise.props({
        contextVersion: Promise.props({
          advanced: true,
          buildDockerfilePath: Parser.buildDockerfilePathParser({ build: service.build, warnings, dockerComposeFilePath })
        }),
        files: Parser.filesParser({ image: service.image, warnings, dockerComposeFilePath }),
        instance: Promise.props({
          containerStartCommand: Parser.commandParser({ command: service.command, warnings }),
          ports: Parser.portsParser({ ports: service.ports, warnings }),
          // TODO: Will require more work because of links and dependencies
          env: Parser.envParser({ env: service.environment, warnings })
        })
      })
      return [res, warnings]
    })
    .spread((res, warnings) => {
      res.warnings = warnings
      res.contextVersion = removeNullAndUndefinedKeys(res.contextVersion)
      res.instance = removeNullAndUndefinedKeys(res.instance)
      res = removeNullAndUndefinedKeys(res)
      return res
    })
  }
}
