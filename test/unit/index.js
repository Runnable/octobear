'use strict'

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
})
