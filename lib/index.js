'use strict'
const Promise = require('bluebird')
const yaml = require('js-yaml')
const Joi = require('joi')
const path = require('path')

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
  links: arrayOfStrings, // TODO:
  depends_on: arrayOfStrings, // TODO
  environnment: arrayOfStrings
}
const serviceSchema = Joi.object(serviceSchemaKeys).unknown().required()

module.exports = class DockerComposeParser {

  static parse (dockerComposeFileString, dockerComposeFilePath) {
    return Promise.try(() => {
      const dockerCompose = yaml.safeLoad(dockerComposeFileString)
      return DockerComposeParser._validate(dockerComposeFileSchema, dockerCompose)
      .then(dockerCompose => dockerCompose.services)
    })
    .then(services => {
      const results = Promise.map(Object.keys(services), key => {
        return DockerComposeParser._serviceParser(services[key], dockerComposeFilePath)
      })
      return Promise.props({ results })
    })
  }

  static _validate (schema, payload) {
    return Promise.fromCallback(cb => {
      schema.validate(payload, cb)
    })
    .catch(err => {
      throw new Error(`Your docker-compose file is invalid: ${err.toString}`, {
        payload
      })
    })
  }

  static _serviceParser (service, dockerComposeFilePath) {
    const warnings = []
    return DockerComposeParser._validate(serviceSchema, service)
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
        containerStartCommand: DockerComposeParser._commandParser({ command: service.command, warnings }),
        buildDockerFilePath: DockerComposeParser._buildDockerfilePathParser({ build: service.build, warnings, dockerComposeFilePath }),
        ports: DockerComposeParser._portsParser({ ports: service.ports, warnings }),
        // TODO: Will require more work because of links and dependencies
        envs: DockerComposeParser._envParser({ envs: service.environment, warnings })
      })
    })
  }

  static _commandParser (opts) {
    const command = opts.command
    if (!command) return null
    if (Array.isArray(command)) {
      return command.join(' ')
    }
    return command
  }

  static _buildDockerfilePathParser (opts) {
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

  static _portsParser (opts) {
    const ports = opts.ports
    // const warnings = opts.warnings
    if (!ports) return []
    return ports.map(port => {
      if (port.match(/[0-9]*/)) {
        return parseInt(port, 10)
      }
    })
  }

  static _envParser (opts) {
    const envs = opts.envs
    return envs
  }

}
