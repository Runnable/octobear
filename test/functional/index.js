'use strict'
const Promise = require('bluebird')
const { parse } = require('index')
// const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const { createContextVersionAndInstance, deleteInstances } = require('./util')

describe('Cleanup', function () {
  it('should delete the instances', () => {
    return deleteInstances(process.env.GITHUB_USERNAME, /compose-test-repo/)
  })
})

describe('1. Instance with Dockerfile', () => {
  describe('1.1: Simple Docker Compose File', () => {
    const dockerComposeFilePath = path.join(__dirname, '../repos/compose-test-repo-1.1/docker-compose.yml')
    const dockerComposeFile = fs.readFileSync(dockerComposeFilePath).toString()

    it('should correctly create the container', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        return Promise.map(services, service => {
          return createContextVersionAndInstance({
            instanceSpec: service.instance,
            contextVersionSpec: service.contextVersion,
            files: service.files,
            repo: 'compose-test-repo-1.1'
          })
        })
      })
    })
  })

  describe('1.2: Dockerfile in other location + Different ports', () => {
    const dockerComposeFilePath = path.join(__dirname, '../repos/compose-test-repo-1.2/docker-compose.yml')
    const dockerComposeFile = fs.readFileSync(dockerComposeFilePath).toString()

    it('should correctly create the container', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        return Promise.map(services, service => {
          return createContextVersionAndInstance({
            instanceSpec: service.instance,
            contextVersionSpec: service.contextVersion,
            files: service.files,
            repo: 'compose-test-repo-1.2'
          })
        })
      })
    })
  })

  describe('1.3: Dockerfile with context + container start command', () => {
    const dockerComposeFilePath = path.join(__dirname, '../repos/compose-test-repo-1.3/docker-compose.yml')
    const dockerComposeFile = fs.readFileSync(dockerComposeFilePath).toString()

    it('should correctly create the container', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        return Promise.map(services, service => {
          return createContextVersionAndInstance({
            instanceSpec: service.instance,
            contextVersionSpec: service.contextVersion,
            files: service.files,
            repo: 'compose-test-repo-1.3'
          })
        })
      })
    })
  })
})

describe('2. Instance with Image', () => {
  describe('2.1', () => {
    const dockerComposeFilePath = path.join(__dirname, '../repos/compose-test-repo-2.1/docker-compose.yml')
    const dockerComposeFile = fs.readFileSync(dockerComposeFilePath).toString()

    it('should correctly create the container', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        return Promise.map(services, service => {
          return createContextVersionAndInstance({
            instanceSpec: service.instance,
            contextVersionSpec: service.contextVersion,
            files: service.files,
            repo: 'compose-test-repo-2.1'
          })
        })
      })
    })
  })
})

describe('3. Multiple Instances with linking', () => {
  // TODO: Test ENVs
})
