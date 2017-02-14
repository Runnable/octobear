'use strict'

const { expect } = require('chai')
const DockerComposeParser = require('index')

describe('Index', () => {
  describe('#_parseDockerComposeFile', () => {
    let yml

    it('should return fine with version 2', (done) => {
      yml = `
version: '2'
services:
  web:
    build: .
    ports:
      - "7890:7890"
`
      DockerComposeParser._parseDockerComposeFile(yml)
        .asCallback(done)
    })

    it('should return fine with version 2.0', (done) => {
      yml = `
version: '2.0'
services:
  web:
    build: .
    ports:
      - "7890:7890"
`
      DockerComposeParser._parseDockerComposeFile(yml)
        .asCallback(done)
    })

    it('should pass with version 3', (done) => {
      yml = `
version: '3.0'
services:
  web:
    build: .
    ports:
      - "7890:7890"
`
      DockerComposeParser._parseDockerComposeFile(yml)
        .asCallback(done)
    })
    it('should fail with version 2.a', (done) => {
      yml = `
version: '2.a'
services:
  web:
    build: .
    ports:
      - "7890:7890"
`
      DockerComposeParser._parseDockerComposeFile(yml)
        .then(() => { done(new Error('Should have failed')) })
        .catch(() => done())
    })
  })

  describe('#populateENVsFromFiles', () => {
    let services
    let envFilesMap
    beforeEach(() => {
      services = [{
        metadata: {
          envFiles: ['./file-that-exists', './file-that-doesnt-exist'],
          links: []
        },
        instance: {
          env: ['WOW=GREAT']
        }
      }]
      envFilesMap = {
        './file-that-exists': 'HELLO=WOW'
      }
    })

    it('should ignore a file if the file was not passed', () => {
      services = DockerComposeParser.populateENVsFromFiles(services, envFilesMap)
      expect(services).to.have.deep.property('[0].instance.env')
      expect(services[0].instance.env).to.deep.equal([
        'WOW=GREAT',
        'HELLO=WOW'
      ])
    })
  })
})
