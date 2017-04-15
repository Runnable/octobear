'use strict'
require('loadenv')()
const { parse, populateENVsFromFiles } = require('index')
const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const sanitizeName = require('../util').sanitizeName
const getDockerFile = require('../util').getDockerFile
const getComposeFile = require('../util').getComposeFile
const getAllENVFiles = require('../util').getAllENVFiles

const userContentDomain = 'runnable.ninja'
const ownerUsername = process.env.GITHUB_USERNAME
const scmDomain = 'github.com'

describe('1. Instance with Dockerfile', () => {
  describe('1.1: Simple Docker Compose File', () => {
    const repositoryName = 'compose-test-repo-1.1'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should return one instance', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should return the correct `dockerFilePath` and `dockerBuildContext`', () => {
      expect(services).to.have.deep.property('[0].build.dockerFilePath')
      expect(services).to.have.deep.property('[0].build.dockerBuildContext')
      expect(services[0].build.dockerFilePath).to.equal('/Dockerfile')
      expect(services[0].build.dockerBuildContext).to.equal('.')
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
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have the right number of services', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should return the correct `dockerFilePath` and `dockerBuildContext`', () => {
      expect(services).to.have.deep.property('[0].build.dockerFilePath')
      expect(services).to.have.deep.property('[0].build.dockerBuildContext')
      expect(services).to.be.an.object
      expect(services[0].build.dockerFilePath).to.equal('/src/Dockerfile')
      expect(services[0].build.dockerBuildContext).to.equal('./src/')
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
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have the right number of services', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should return the correct `dockerFilePath` and `dockerBuildContext`', () => {
      expect(services).to.have.deep.property('[0].build.dockerFilePath')
      expect(services).to.have.deep.property('[0].build.dockerBuildContext')
      expect(services[0].build.dockerFilePath).to.equal('/src/not-so-dockerfile.Dockerfile')
      expect(services[0].build.dockerBuildContext).to.equal('./src/')
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
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have the right number of services', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should return the correct `dockerFilePath` and `dockerBuildContext`', () => {
      expect(services).to.have.deep.property('[0].build.dockerFilePath')
      expect(services).to.have.deep.property('[0].build.dockerBuildContext')
      expect(services[0].build.dockerFilePath).to.equal('/src/not-so-dockerfile.Dockerfile')
      expect(services[0].build.dockerBuildContext).to.equal('../src/')
    })
  })
})

describe('2. Instance with Image', () => {
  describe('2.1', () => {
    const repositoryName = 'compose-test-repo-2.1'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have the right number of services', () => {
      expect(services).to.have.lengthOf(2)
    })

    it('should not return a `dockerBuildPath` on either', () => {
      expect(services[0]).to.not.have.property('buildDockerfilePath')
      expect(services[1]).to.not.have.property('buildDockerfilePath')
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
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
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

      it('should return a `dockerFilePath` and `dockerBuildContext`', () => {
        expect(services).to.have.deep.property('[0].build.dockerFilePath')
        expect(services).to.have.deep.property('[0].build.dockerBuildContext')
        expect(services[0].build.dockerFilePath).to.equal('/Dockerfile')
        expect(services[0].build.dockerBuildContext).to.equal('.')
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
    })
  })

  describe('3.2: Hello Node `depends_on`', () => {
    const repositoryName = 'compose-test-repo-3.2'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
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
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
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
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
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
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
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

  describe('4.3: Relative Paths', () => {
    const repositoryName = 'compose-test-repo-4.3'
    const dockerComposeFilePath = 'docker/compose.yml'
    const absoluteDockerComposeFilePath = path.join(__dirname, `../repos/${repositoryName}/${dockerComposeFilePath}`)
    const dockerComposeFileString = fs.readFileSync(absoluteDockerComposeFilePath).toString()
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain, dockerComposeFilePath })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should have a single service', () => {
      expect(services).to.have.lengthOf(1)
    })

    describe('Main Instance', () => {
      it('should return the correct initial ENVs', () => {
        expect(services).to.not.have.deep.property('[0].instance.env')
      })

      it('should have the correct metadata for the env files and ENV mappings', () => {
        expect(services[0].metadata.envFiles.slice().sort()).to.deep.equal([ '.env', 'docker/.env', 'src/.env' ].sort())
      })

      it('should correctly apply those ENV mappings when provided the files', () => {
        const envFiles = getAllENVFiles(services[0].metadata.envFiles, null, `repos/${repositoryName}/`)
        return populateENVsFromFiles(services, envFiles)
          .then(services => {
            expect(services).to.have.deep.property('[0].instance.env')
            expect(services[0].instance.env).to.deep.equal([
              `ENV1=true`, // ENV in docker/.env
              `ENV2=true`, // ENV in .env
              `ENV3=true`  // ENV in src/.env
            ])
          })
      })
    })
  })
})

describe('5. Links and aliases', () => {
  describe('5.1', () => {
    const repositoryName = 'compose-test-repo-5.1'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
      .then(({ results: servicesResults, envFiles }) => {
        services = servicesResults
      })
    })

    it('should have 5 services', () => {
      expect(services).to.have.lengthOf(5)
    })

    describe('Main Instance', () => {
      it('should have the correct aliases in the instances property', () => {
        expect(services).to.have.deep.property('[0].instance.aliases')
        expect(services[0].instance.aliases).to.be.an.object
      })

      it('should have the correct links', () => {
        expect(services).to.have.deep.property('[0].metadata.links')
        expect(services[0].metadata.links).to.deep.equal([
          'rethinkdb1',
          'rethinkdb2',
          'rethinkdb3',
          'rethinkdb4'
        ])
      })

      it('should have the correct aliases in the instances property', () => {
        expect(services[0].instance.aliases).to.deep.equal({
          'cmV0aGlua2RiMQ==': {
            'alias': 'rethinkdb1',
            'instanceName': 'compose-test-repo-5-1-rethinkdb1'
          },
          'cmV0aGlua2RiMg==': {
            'alias': 'rethinkdb2',
            'instanceName': 'compose-test-repo-5-1-rethinkdb2'
          },
          'c29tZS13ZWlyZC1ob3N0': {
            'alias': 'some-weird-host',
            'instanceName': 'compose-test-repo-5-1-rethinkdb2'
          },
          'cmV0aGlua2RiMw==': {
            'alias': 'rethinkdb3',
            'instanceName': 'compose-test-repo-5-1-rethinkdb3'
          },
          'cmV0aGlua2RiNA==': {
            'alias': 'rethinkdb4',
            'instanceName': 'compose-test-repo-5-1-rethinkdb4'
          },
          'dGhyZWUtY2hhbmdpbmctdGhlLWhvc3RuYW1l': {
            'alias': 'three-changing-the-hostname',
            'instanceName': 'compose-test-repo-5-1-rethinkdb4'
          },
          'dGhyZWUtY2hhbmdpbmctdGhlLXdlaXJkLWhvc3Q=': {
            'alias': 'three-changing-the-weird-host',
            'instanceName': 'compose-test-repo-5-1-rethinkdb3'
          }
        })
      })

      it('should not replace aliases with hostnames', () => {
        const hostname1 = `${sanitizeName(repositoryName)}-rethinkdb3-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        const hostname2 = `${sanitizeName(repositoryName)}-rethinkdb4-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[0].instance.env).to.deep.equal([
          `PORT=3000`,
          `RETHINKDB_3_1=${hostname1}`,
          `RETHINKDB_3_2=three-changing-the-weird-host`,
          `RETHINKDB_4_3=${hostname2}`
        ])
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

      it('should not replace aliases with hostnames', () => {
        const hostname1 = `${sanitizeName(repositoryName)}-rethinkdb3-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        const hostname2 = `${sanitizeName(repositoryName)}-rethinkdb4-staging-${ownerUsername.toLowerCase()}.${userContentDomain}`
        expect(services).to.have.deep.property('[0].instance.env')
        expect(services[0].instance.env).to.deep.equal([
          `PORT=3000`,
          `RETHINKDB_3_1=${hostname1}`,
          `RETHINKDB_3_2=three-changing-the-weird-host`,
          `RETHINKDB_4_3=${hostname2}`,
          `RETHINKDB_4_1=${hostname2}`,
          `RETHINKDB_4_2=three-changing-the-hostname`
        ])
      })
    })
  })
})

describe('6. Build GitHub repos', () => {
  describe('6.1: Build from GitHub Repo', () => {
    const repositoryName = 'compose-test-repo-6.1'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should return one instance', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should return the correct `dockerFilePath` and `dockerBuildContext`', () => {
      expect(services).to.have.deep.property('[0].build.dockerFilePath')
      expect(services).to.have.deep.property('[0].build.dockerBuildContext')
      expect(services[0].build.dockerFilePath).to.equal('/Dockerfile')
      expect(services[0].build.dockerBuildContext).to.equal(undefined)
    })

    it('should return the correct `code`', () => {
      expect(services).to.have.deep.property('[0].code')
      expect(services[0].code.repo).to.equal('RunnableTest/node-starter')
      expect(services[0].code.commitish).to.equal(undefined)
    })

    it('should return the correct ports', () => {
      expect(services).to.have.deep.property('[0].instance.ports')
      expect(services[0].instance.ports).to.be.an.array
      expect(services[0].instance.ports[0]).to.be.a.number
      expect(services[0].instance.ports[0]).to.equal(7890)
    })
  })
  describe('6.2: Build from GitHub Repo with commitish', () => {
    const repositoryName = 'compose-test-repo-6.2'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
      .then(({ results: servicesResults }) => {
        services = servicesResults
      })
    })

    it('should return one instance', () => {
      expect(services).to.have.lengthOf(1)
    })

    it('should return the correct `dockerFilePath` and `dockerBuildContext`', () => {
      expect(services).to.have.deep.property('[0].build.dockerFilePath')
      expect(services).to.have.deep.property('[0].build.dockerBuildContext')
      expect(services[0].build.dockerFilePath).to.equal('/Dockerfile')
      expect(services[0].build.dockerBuildContext).to.equal(undefined)
    })

    it('should return the correct `code`', () => {
      expect(services).to.have.deep.property('[0].code')
      expect(services[0].code.repo).to.equal('RunnableTest/node-starter')
      expect(services[0].code.commitish).to.equal('dark-theme')
    })

    it('should return the correct ports', () => {
      expect(services).to.have.deep.property('[0].instance.ports')
      expect(services[0].instance.ports).to.be.an.array
      expect(services[0].instance.ports[0]).to.be.a.number
      expect(services[0].instance.ports[0]).to.equal(7890)
    })
  })

  describe('6.3: Picking the right master with github', () => {
    const repositoryName = 'compose-test-repo-6.3'
    const { dockerComposeFileString } = getDockerFile(repositoryName)
    let services

    before(() => {
      return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
        .then(({ results: servicesResults }) => {
          services = servicesResults
        })
    })

    it('should return two instances', () => {
      expect(services).to.have.lengthOf(2)
    })

    it('should set api to isMain', () => {
      const api = services.find(service => service.metadata.name === 'api')
      expect(api).to.have.deep.property('metadata.isMain', true)
    })
  })
  describe('7. Support Build Contexts', () => {
    describe('7.1: Compose in root and Dockerfile in folder', () => {
      const repositoryName = 'compose-test-repo-7.1'
      const { dockerComposeFileString } = getDockerFile(repositoryName)
      let services

      before(() => {
        return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
        .then(({ results: servicesResults }) => {
          services = servicesResults
        })
      })

      it('should return one instance', () => {
        expect(services).to.have.lengthOf(1)
      })

      it('should return the correct `dockerFilePath` and `dockerBuildContext`', () => {
        expect(services).to.have.deep.property('[0].build.dockerFilePath')
        expect(services).to.have.deep.property('[0].build.dockerBuildContext')
        expect(services[0].build.dockerFilePath).to.equal('/docker/not-so-dockerfile.Dockerfile')
        expect(services[0].build.dockerBuildContext).to.equal('.')
      })
    })
    describe('7.2: Compose and Dockerfile are in different subfolders', () => {
      const repositoryName = 'compose-test-repo-7.2'
      const { dockerComposeFileString } = getComposeFile(repositoryName, 'src/docker-compose.yml')
      let services

      before(() => {
        return parse({ dockerComposeFileString, repositoryName, userContentDomain, ownerUsername, scmDomain })
        .then(({ results: servicesResults }) => {
          services = servicesResults
        })
      })

      it('should return one instance', () => {
        expect(services).to.have.lengthOf(1)
      })

      it('should return the correct `dockerFilePath` and `dockerBuildContext`', () => {
        expect(services).to.have.deep.property('[0].build.dockerFilePath')
        expect(services).to.have.deep.property('[0].build.dockerBuildContext')
        expect(services[0].build.dockerFilePath).to.equal('/docker/not-so-dockerfile.Dockerfile')
        expect(services[0].build.dockerBuildContext).to.equal('..')
      })
    })
  })
})
