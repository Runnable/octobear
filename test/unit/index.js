'use strict'
const { parse } = require('index')
const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

describe('1. Instance with Dockerfile', () => {
  describe('1.1: Simple Docker Compose File', () => {
    const dockerComposeFilePath = path.join(__dirname, '../repos/compose-test-repo-1.1/docker-compose.yml')
    const dockerComposeFile = fs.readFileSync(dockerComposeFilePath).toString()

    it('should return one instance', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
      })
    })

    it('should return the correct `buildDockerfilePath`', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services[0].contextVersion).to.be.an.object
        expect(services[0].contextVersion.buildDockerfilePath).to.equal('/Dockerfile')
      })
    })

    it('should return the correct ports', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services).to.be.an.object
        expect(services[0].instance.ports).to.be.an.array
        expect(services[0].instance.ports[0]).to.be.a.number
        expect(services[0].instance.ports[0]).to.equal(7890)
      })
    })
  })

  describe('1.2: Dockerfile in other location + Different ports', () => {
    const dockerComposeFilePath = path.join(__dirname, '../repos/compose-test-repo-1.2/docker-compose.yml')
    const dockerComposeFile = fs.readFileSync(dockerComposeFilePath).toString()

    it('should return the correct `buildDockerfilePath`', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services).to.be.an.object
        expect(services[0].contextVersion.buildDockerfilePath).to.equal('/src/Dockerfile')
      })
    })

    it('should return the correct `containerStartCommand`', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services[0].instance).to.be.an.object
        expect(services[0].instance.containerStartCommand).to.equal('node index.js')
      })
    })

    it('should return the correct environment variables', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services[0].instance).to.be.an.object
        expect(services[0].instance.envs).to.deep.equal([
          'NODE_ENV=development',
          'SHOW=true',
          'HELLO=678'
        ])
      })
    })

    it('should return the correct ports', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services[0].instance).to.be.an.object
        expect(services[0].instance.ports).to.be.an.array
        expect(services[0].instance.ports[0]).to.be.a.number
        expect(services[0].instance.ports[0]).to.equal(5000)
      })
    })
  })

  describe('1.3: Dockerfile with context + container start command', () => {
    const dockerComposeFilePath = path.join(__dirname, '../repos/compose-test-repo-1.3/docker-compose.yml')
    const dockerComposeFile = fs.readFileSync(dockerComposeFilePath).toString()

    it('should return the correct `buildDockerfilePath`', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services[0].contextVersion).to.be.an.object
        expect(services[0].contextVersion.buildDockerfilePath).to.equal('/src/not-dockerfile.Dockerfile')
      })
    })

    it('should return the correct `containerStartCommand`', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services[0].instance).to.be.an.object
        expect(services[0].instance.containerStartCommand).to.equal('node index.js')
      })
    })

    it('should return the correct ports', () => {
      return parse(dockerComposeFile)
      .then(({ results: services }) => {
        expect(services).to.have.lengthOf(1)
        expect(services[0].instance).to.be.an.object
        expect(services[0].instance.ports).to.be.an.array
        expect(services[0].instance.ports).to.deep.equal([1000, 2000, 3000, 4000])
      })
    })
  })
})

describe('2. Instance with Image', () => {
  // TODO: Test context-version
})

describe('3. Multiple Instances with linking', () => {
  // TODO: Test ENVs
})
