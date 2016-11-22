'use strict'
const Promise = require('bluebird')
const { parse } = require('index')
// const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const { createContextVersionAndInstance, deleteInstances } = require('./util')

// const sanitizeName = require('../util').sanitaizeName

describe('Cleanup', function () {
  it('should delete the instances', () => {
    return deleteInstances(process.env.GITHUB_USERNAME, /compose-test-repo/)
  })
})

const userContentDomain = process.env.USER_CONTENT_DOMAIN
const ownerUsername = process.env.GITHUB_USERNAME

describe('1.1: Simple Docker Compose File', () => {
  const repo = 'compose-test-repo-1.1'
  const dockerComposeFilePath = path.join(__dirname, `../repos/${repo}/docker-compose.yml`)
  const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()

  it('should correctly create the container', () => {
    return parse({ dockerComposeFileString, repositoryName: repo, userContentDomain, ownerUsername })
    .then(({ results: services }) => {
      return Promise.map(services, service => {
        return createContextVersionAndInstance({
          instanceSpec: service.instance,
          contextVersionSpec: service.contextVersion,
          files: service.files,
          repo
        })
      })
    })
  })
})

describe('1.2: Dockerfile in other location + Different ports', () => {
  const repo = 'compose-test-repo-1.2'
  const dockerComposeFilePath = path.join(__dirname, `../repos/${repo}/docker-compose.yml`)
  const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()

  it('should correctly create the container', () => {
    return parse({ dockerComposeFileString, repositoryName: repo, userContentDomain, ownerUsername })
    .then(({ results: services }) => {
      return Promise.map(services, service => {
        return createContextVersionAndInstance({
          instanceSpec: service.instance,
          contextVersionSpec: service.contextVersion,
          files: service.files,
          repo
        })
      })
    })
  })
})

// Feature not currently supported by image-builder
describe.skip('1.3: Dockerfile with context + container start command', () => {
  const repo = 'compose-test-repo-1.3'
  const dockerComposeFilePath = path.join(__dirname, `../repos/${repo}/docker-compose.yml`)
  const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()

  it('should correctly create the container', () => {
    return parse({ dockerComposeFileString, repositoryName: repo, userContentDomain, ownerUsername })
    .then(({ results: services }) => {
      return Promise.map(services, service => {
        return createContextVersionAndInstance({
          instanceSpec: service.instance,
          contextVersionSpec: service.contextVersion,
          files: service.files,
          repo
        })
      })
    })
  })
})

describe('2.1', () => {
  const repo = 'compose-test-repo-2.1'
  const dockerComposeFilePath = path.join(__dirname, `../repos/${repo}/docker-compose.yml`)
  const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()

  it('should correctly create the container', () => {
    return parse({ dockerComposeFileString, repositoryName: repo, userContentDomain, ownerUsername })
    .then(({ results: services }) => {
      return Promise.map(services, service => {
        return createContextVersionAndInstance({
          instanceSpec: service.instance,
          contextVersionSpec: service.contextVersion,
          files: service.files,
          repo
        })
      })
    })
  })
})

describe('3. Multiple Instances with linking', () => {
  // TODO: Test ENVs
})
