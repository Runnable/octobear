'use strict'
require('loadenv')()
const Promise = require('bluebird')
const { parse } = require('index')
// const { expect } = require('chai')
const { createContextVersionAndInstance, deleteInstances } = require('./util')
const { getDockerFile } = require('../util')

describe('Cleanup', function () {
  it('should delete the instances', () => {
    return deleteInstances(process.env.GITHUB_USERNAME, /compose-test-repo/)
  })
})

const userContentDomain = process.env.USER_CONTENT_DOMAIN
const ownerUsername = process.env.GITHUB_USERNAME

describe('1.1: Simple Docker Compose File', () => {
  const repo = 'compose-test-repo-1.1'
  const { dockerComposeFileString } = getDockerFile(repo)

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
  const { dockerComposeFileString } = getDockerFile(repo)

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
  const { dockerComposeFileString } = getDockerFile(repo)

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
  const { dockerComposeFileString } = getDockerFile(repo)

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

describe('3.1 Multiple Instances with linking', () => {
  const repo = 'compose-test-repo-3.1'
  const { dockerComposeFileString } = getDockerFile(repo)

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

describe('3.2 Multiple Instances with linking', () => {
  const repo = 'compose-test-repo-3.2'
  const { dockerComposeFileString } = getDockerFile(repo)

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
