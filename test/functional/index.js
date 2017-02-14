'use strict'
require('loadenv')()
const { parse, populateENVsFromFiles } = require('index')
const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const sanitizeName = require('../util').sanitizeName
const getDockerFile = require('../util').getDockerFile
const getAllENVFiles = require('../util').getAllENVFiles

const userContentDomain = 'runnable.ninja'
const ownerUsername = process.env.GITHUB_USERNAME

describe('1. Instance with Dockerfile', () => {
  describe('1.1: Simple Docker Compose File', () => {
    const repositoryName = 'compose-test-repo-1.1'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should return one instance', () => {
      expect(services).to.have.lengthOf(1)
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
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
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
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
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
      expect(services[0].instance.ports).to.deep.equal([5000])
    })
  })

  describe('1.4: Dockerfile with compose file in different directory', () => {
    const repositoryName = 'compose-test-repo-1.4'
    const dockerComposeFilePath = path.join(__dirname, `../repos/${repositoryName}/docker/compose.yml`)
    const dockerComposeFileString = fs.readFileSync(dockerComposeFilePath).toString()
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
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
  })
})

describe('2. Instance with Image', () => {
  describe('2.1', () => {
    const repositoryName = 'compose-test-repo-2.1'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have the right number of services', () => {
      expect(services).to.have.lengthOf(2)
    })

    it('should not return a `dockerBuildPath` on either', () => {
      expect(services).to.have.deep.property('[0].contextVersion')
      expect(services[0].contextVersion).to.not.have.property('buildDockerfilePath')
      expect(services).to.have.deep.property('[1].contextVersion')
      expect(services[1].contextVersion).to.not.have.property('buildDockerfilePath')
    })

    it('should return a `files` object for the normal entry', () => {
      expect(services).to.have.deep.property('[0].files')
      const files = services[0].files
      expect(files).to.have.property('/Dockerfile')
      expect(files['/Dockerfile'].body).to.match(/FROM/)
      expect(files['/Dockerfile'].body).to.match(/dtestops\/mysql:5.7/)
    })

    it('should return a `files` object from the default main we had to create', () => {
      expect(services).to.have.deep.property('[1].files')
      const files = services[1].files
      expect(files).to.have.property('/Dockerfile')
      expect(files['/Dockerfile'].body).to.match(/FROM/)
      expect(files['/Dockerfile'].body).to.match(/busybox/)
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
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have 2 services', () => {
      expect(services).to.have.lengthOf(2)
    })

    describe('Main Instance', () => {
      it('should have a `main` container', () => {
        expect(services).to.have.deep.property('[0].metadata.isMain', true)
      })

      it('should return a `dockerBuildPath`', () => {
        expect(services).to.have.deep.property('[0].contextVersion.buildDockerfilePath')
        expect(services[0].contextVersion.buildDockerfilePath).to.equal('/Dockerfile')
      })

      it('should return the right ports', () => {
        expect(services).to.have.deep.property('[0].instance.ports')
        expect(services[0].instance.ports).to.deep.equal([5000])
      })

      it('should return the correct ENVs', () => {
        const hostname = `${sanitizeName(repositoryName)}-db-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[0].instance.env).to.deep.equal([
          `DB_PORT=tcp://${hostname}:5432`
        ])
      })
    })

    describe('Secondary Instance', () => {
      it('should not a be a `main` container', () => {
        expect(services).to.have.deep.property('[1].metadata.isMain', false)
      })

      it('should have the required files', () => {
        expect(services).to.have.deep.property('[1].files')
        const files = services[1].files
        expect(files).to.have.property('/Dockerfile')
        expect(files['/Dockerfile'].body).to.match(/FROM/)
        expect(files['/Dockerfile'].body).to.match(/postgres/)
      })

      it('should return the right context version properties', () => {
        expect(services).to.have.deep.property('[1].contextVersion.advanced')
        expect(services[1].contextVersion.advanced).to.equal(true)
      })
    })
  })

  describe('3.2: Hello Node `depends_on`', () => {
    const repositoryName = 'compose-test-repo-3.2'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have 2 services', () => {
      expect(services).to.have.lengthOf(2)
    })

    describe('Main Instance', () => {
      it('should return the correct ENVs', () => {
        const hostname = `${sanitizeName(repositoryName)}-db-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[0].instance.env).to.deep.equal([
          `RETHINKDB=${hostname}`
        ])
      })
    })
  })

  describe('3.3: Strict dependencies', () => {
    const repositoryName = 'compose-test-repo-3.3'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have 3 services', () => {
      expect(services).to.have.lengthOf(3)
    })

    describe('Main Instance', () => {
      it('should return the correct ENVs', () => {
        const hostname = `${sanitizeName(repositoryName)}-rethinkdb-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[0].instance.env).to.deep.equal([
          `RETHINKDB=${hostname}`,
          `REDIS=redis`
        ])
      })
    })

    describe('Secondary Instance', () => {
      it('should return the correct ENVs', () => {
        const hostname = `${sanitizeName(repositoryName)}-redis-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[1].instance.env).to.deep.equal([
          `RETHINKDB=rethinkdb`,
          `REDIS=${hostname}`
        ])
      })
    })
  })
})

describe('4. Use of env_file', () => {
  describe('4.1: Hello Node `depends_on`', () => {
    const repositoryName = 'compose-test-repo-4.1'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have 3 services', () => {
      expect(services).to.have.lengthOf(3)
    })

    describe('Main Instance', () => {
      it('should return the correct initial ENVs', () => {
        expect(services).to.not.have.deep.property('[0].instance.env')
      })

      it('should have the correct metadata for the env files and ENV mappings', () => {
        expect(services[0].metadata.envFiles).to.deep.equal([ '.env' ])
        expect(services[0].metadata.links).to.deep.equal([ 'db', 'db1' ])
      })

      it('should correctly apply those ENV mappings when provided the files', () => {
        const envFiles = getAllENVFiles(services[0].metadata.envFiles, repositoryName)
        const hostname1 = `${sanitizeName(repositoryName)}-db1-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        const hostname2 = `${sanitizeName(repositoryName)}-db-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        return populateENVsFromFiles(services, envFiles)
          .then(services => {
            expect(services).to.have.deep.property('[0].instance.env')
            expect(services[0].instance.env).to.deep.equal([
              `RETHINKDB=${hostname1}`,
              `DB_PORT=tcp://${hostname2}:5432`
            ])
          })
      })
    })
  })

  describe('4.2 mutliple files in diff directories', () => {
    const repositoryName = 'compose-test-repo-4.2'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername })
      .then(({ results: servicesResults, envFiles }) => {
        services = servicesResults
      })
    })

    it('should have 3 services', () => {
      expect(services).to.have.lengthOf(3)
    })

    describe('Main Instance', () => {
      it('should return the correct ENVs', () => {
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[0].instance.env).to.deep.equal([
          `ENVIRONMENT=staging`
        ])
      })

      it('should have the correct metadata for the env files and ENV mappings', () => {
        expect(services[0].metadata.envFiles).to.deep.equal([ 'env/some-environment-name/.env', 'env/some-environment-name/another-env-file.txt' ])
        expect(services[0].metadata.links).to.deep.equal([ 'rethinkdb' ])
      })
    })

    describe('Secondary Instance', () => {
      it('should return the correct ENVs', () => {
        expect(services).to.not.have.deep.property('[1].instance.env')
      })

      it('should have the correct metadata for the env files and ENV mappings', () => {
        expect(services[1].metadata.envFiles).to.deep.equal([ 'env/some-environment-name/.env', 'env/some-environment-name/another-env-file.txt' ])
        expect(services[1].metadata.links).to.deep.equal([ 'redis' ])
      })
    })

    describe('After Parsing ENVs', () => {
      before(() => {
        const envFiles = getAllENVFiles(services[0].metadata.envFiles, repositoryName)
        return populateENVsFromFiles(services, envFiles)
          .then(res => {
            services = res
          })
      })

      it('should correctly apply those ENV mappings when provided the files', () => {
        const hostname = `${sanitizeName(repositoryName)}-rethinkdb-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[0].instance.env).to.deep.equal([
          `ENVIRONMENT=staging`,
          `RETHINKDB=${hostname}`,
          `REDIS=redis`
        ])
      })

      it('should correctly apply those ENV mappings when provided the files', () => {
        const hostname = `${sanitizeName(repositoryName)}-redis-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[1].instance.env).to.deep.equal([
          `RETHINKDB=rethinkdb`,
          `REDIS=${hostname}`
        ])
      })
    })
  })
})
