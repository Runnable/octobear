'use strict'
require('loadenv')()
const { parse } = require('index')
const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

const userContentDomain = 'runnable.ninja'
const ownerUsername = process.env.GITHUB_USERNAME
const sanitizeName = x => x.replace(/[^a-zA-Z0-9-]/g, '-')

describe('1. Instance with Dockerfile', () => {
  describe('1.1: Simple Docker Compose File', () => {
    const repositoryName = 'compose-test-repo-1.1'
    const dockerComposeFilePath = path.join(__dirname, `../repos/${repositoryName}/docker-compose.yml`)
    const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
    let services

    before(() => {
      return parse({ dockerComposeFileString, dockerComposeFilePath, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should return the correct `buildDockerfilePath`', () => {
      expect(services).to.have.deep.property('[0].contextVersion.buildDockerfilePath')
      expect(services[0].contextVersion.buildDockerfilePath).to.equal('/Dockerfile')
    })

    it('should return the correct ports', () => {
      expect(services).to.have.deep.property('[0].instance.ports')
      expect(services[0].instance.ports).to.be.an.array
      expect(services[0].instance.ports[0]).to.be.a.number
      expect(services[0].instance.ports[0]).to.equal(7890)
    })
  })

  describe('1.2: Dockerfile in other location + Different ports', () => {
    const repositoryName = 'compose-test-repo-1.2'
    const dockerComposeFilePath = path.join(__dirname, `../repos/${repositoryName}/docker-compose.yml`)
    const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
    let services

    before(() => {
      return parse({ dockerComposeFileString, dockerComposeFilePath, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have the right number of services', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should return the correct `buildDockerfilePath`', () => {
      expect(services).to.have.deep.property('[0].instance.containerStartCommand')
      expect(services).to.be.an.object
      expect(services[0].contextVersion.buildDockerfilePath).to.equal('/src/Dockerfile')
    })

    it('should return the correct `containerStartCommand`', () => {
      expect(services).to.have.deep.property('[0].instance.containerStartCommand')
      expect(services[0].instance.containerStartCommand).to.equal('node index.js')
    })

    it('should return the correct environment variables', () => {
      expect(services).to.have.deep.property('[0].instance.env')
      expect(services[0].instance.env).to.deep.equal([
        'NODE_ENV=development',
        'SHOW=true',
        'HELLO=678'
      ])
    })

    it('should return the correct ports', () => {
      expect(services).to.have.deep.property('[0].instance.ports')
      expect(services[0].instance.ports).to.be.an.array
      expect(services[0].instance.ports[0]).to.be.a.number
      expect(services[0].instance.ports[0]).to.equal(5000)
    })
  })

  describe('1.3: Dockerfile with context + container start command', () => {
    const repositoryName = 'compose-test-repo-1.3'
    const dockerComposeFilePath = path.join(__dirname, `../repos/${repositoryName}/docker-compose.yml`)
    const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
    let services

    before(() => {
      return parse({ dockerComposeFileString, dockerComposeFilePath, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have the right number of services', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should return the correct `buildDockerfilePath`', () => {
      expect(services).to.have.deep.property('[0].contextVersion.buildDockerfilePath')
      expect(services[0].contextVersion.buildDockerfilePath).to.equal('/src/not-so-dockerfile.Dockerfile')
    })

    it('should return the correct `containerStartCommand`', () => {
      expect(services).to.have.deep.property('[0].instance.containerStartCommand')
      expect(services[0].instance.containerStartCommand).to.equal('node index.js')
    })

    it('should return the correct ports', () => {
      expect(services).to.have.deep.property('[0].instance.ports')
      expect(services[0].instance.ports).to.deep.equal([1000, 2000, 3000, 4000])
    })
  })
})

describe('2. Instance with Image', () => {
  describe('2.1', () => {
    const repositoryName = 'compose-test-repo-2.1'
    const dockerComposeFilePath = path.join(__dirname, `../repos/${repositoryName}/docker-compose.yml`)
    const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
    let services

    before(() => {
      return parse({ dockerComposeFileString, dockerComposeFilePath, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have the right number of services', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should not return a `dockerBuildPath`', () => {
      expect(services).to.have.deep.property('[0].contextVersion')
      expect(services[0].contextVersion).to.not.have.property('buildDockerfilePath')
    })

    it('should return a `files` object', () => {
      expect(services).to.have.deep.property('[0].files')
      const files = services[0].files
      expect(files).to.have.property('/Dockerfile')
      expect(files['/Dockerfile'].body).to.match(/FROM/)
      expect(files['/Dockerfile'].body).to.match(/dtestops\/mysql:5.7/)
    })

    it('should the environment variables', () => {
      expect(services).to.have.deep.property('[0].instance')
      expect(services[0].instance.env).to.deep.equal([
        'MYSQL_ROOT_PASSWORD=secret'
      ])
    })

    it('should provide the correct warnings', () => {
      expect(services).to.have.deep.property('[0].warnings')
      const warnings = services[0].warnings
      expect(warnings).to.be.an.array
      expect(warnings[0].message).to.match(/keys.*specified/)
      expect(warnings[0].keys).to.deep.equal(['container_name', 'hostname', 'volumes'])
    })
  })
})

describe('3. Multiple Instances with linking', () => {
  describe('3.1: Multiple Instances (Node and DB)', () => {
    const repositoryName = 'compose-test-repo-3.1'
    const dockerComposeFilePath = path.join(__dirname, `../repos/${repositoryName}/docker-compose.yml`)
    const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
    let services

    before(() => {
      return parse({ dockerComposeFileString, dockerComposeFilePath, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have 2 services', () => {
      expect(services).to.have.lengthOf(2)
    })

    describe('Main Instance', () => {
      it('should return a `dockerBuildPath`', () => {
        expect(services).to.have.deep.property('[0].contextVersion.buildDockerfilePath')
        expect(services[0].contextVersion.buildDockerfilePath).to.equal('/Dockerfile')
      })

      it('should return the right ports', () => {
        expect(services).to.have.deep.property('[0].instance.ports')
        expect(services[0].instance.ports).to.deep.equal([5000])
      })

      it('should return the correct ENVs', () => {
        const hostname = `${ sanitizeName(repositoryName) }-db-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[0].instance.env).to.deep.equal([
          `DB_PORT=tcp://${hostname}:5432`
        ])
      })
    })
  })
})
