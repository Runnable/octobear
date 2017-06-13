'use strict'

const { expect } = require('chai')
const DockerComposeParser = require('index')
const sinon = require('sinon')

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

  describe('#_getMains', () => {
    let services
    let opts
    const allServices = {
      web: {
        metadata: {
          name: 'web'
        },
        build: {},
        code: {
          repo: 'https://github.com/Runnable/test-compose'
        }
      },
      api: {
        metadata: {
          name: 'api'
        },
        build: {},
        code: {
          repo: 'git@github.com/Runnable/test-compose'
        }
      },
      api2: {
        metadata: {
          name: 'api2'
        },
        build: '.'
      },
      database: {
        metadata: {
          name: 'database'
        },
        image: 'asdasdasd'
      },
      web2: {
        metadata: {
          name: 'web2'
        },
        build: {
          context: 'asdassad'
        }
      }
    }
    beforeEach(() => {
      sinon.stub(DockerComposeParser, 'addMainIfMissing').returns()
      services = [allServices.web, allServices.api, allServices.api2, allServices.web2, allServices.database]
      opts = {
        skipMissingMainCheck: true
      }
    })

    afterEach(() => {
      DockerComposeParser.addMainIfMissing.restore()
    })
    let mains

    it('should put web2 and api2 in builds', done => {
      mains = DockerComposeParser._getMains(services, opts)
      expect(mains.builds.web2).to.equal(allServices.web2)
      expect(mains.builds.api2).to.equal(allServices.api2)
      done()
    })
    it('should put web and api in externals', done => {
      mains = DockerComposeParser._getMains(services, opts)
      expect(mains.externals.web).to.equal(allServices.web)
      expect(mains.externals.api).to.equal(allServices.api)
      done()
    })
    it('should call addMainIfMissing is skipMissingMainCheck is true', done => {
      opts.skipMissingMainCheck = false
      mains = DockerComposeParser._getMains(services, opts)
      sinon.assert.calledOnce(DockerComposeParser.addMainIfMissing)
      sinon.assert.calledWith(DockerComposeParser.addMainIfMissing, services, mains, opts)
      done()
    })
  })

  describe('#addMainIfMissing', () => {
    let opts
    const services = []
    const repoName = 'hello'
    const userContentDomain = 'Runnable'
    const ownerUsername = 'chickachicka'
    const allServices = {
      web: {
        metadata: {
          name: 'web'
        }
      },
      api2: {
        metadata: {
          name: 'api2'
        },
        build: {},
        code: {
          repo: 'git@github.com/Runnable/test-compose'
        }
      }
    }
    let noMains
    beforeEach(() => {
      noMains = {
        builds: {},
        externals: {}
      }
      sinon.stub(DockerComposeParser, '_populateHostname').returns()
      opts = {
        repositoryName: repoName,
        userContentDomain,
        ownerUsername,
        skipMissingMainCheck: true
      }
    })

    afterEach(() => {
      DockerComposeParser._populateHostname.restore()
    })

    it('should skip everything with at least 1 main (builds)', done => {
      const someMains = {
        builds: {
          web: allServices.web
        }
      }
      DockerComposeParser.addMainIfMissing(services, someMains, opts)
      expect(someMains.builds[repoName]).to.not.be.an('object')
      sinon.assert.notCalled(DockerComposeParser._populateHostname)
      done()
    })
    it('should skip everything with at least 1 main (externals)', done => {
      const someMains = {
        builds: {
          web: allServices.web
        }
      }
      DockerComposeParser.addMainIfMissing(services, someMains, opts)
      expect(someMains.builds[repoName]).to.not.be.an('object')
      sinon.assert.notCalled(DockerComposeParser._populateHostname)
      done()
    })
    it('should add new main when none given', done => {
      DockerComposeParser.addMainIfMissing(services, noMains, opts)
      expect(noMains.builds[repoName]).to.be.an('object')
      expect(services[0]).to.be.an('object')
      done()
    })
    it('should call _populateHostname when no mains given', done => {
      DockerComposeParser.addMainIfMissing(services, noMains, opts)
      sinon.assert.calledOnce(DockerComposeParser._populateHostname)
      sinon.assert.calledWith(DockerComposeParser._populateHostname, sinon.match.object, ownerUsername, userContentDomain)
      done()
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
      return DockerComposeParser.populateENVsFromFiles(services, envFilesMap)
        .then(services => {
          expect(services).to.have.deep.property('[0].instance.env')
          expect(services[0].instance.env).to.deep.equal([
            'WOW=GREAT',
            'HELLO=WOW'
          ])
        })
    })
  })

  describe('#findExtendedFiles', () => {
    let yml
    it('should return 2 found files', () => {
      yml = `
version: '2'
services:
  web:
    extends:
       file: common.yml
  db:
    image: postgres
  api:
    extends:
       file: base.yml
`
      DockerComposeParser.findExtendedFiles(yml)
      .tap((paths) => {
        expect(paths.length).to.equal(2)
        expect(paths[0]).to.equal('common.yml')
        expect(paths[1]).to.equal('base.yml')
      })
    })

    it('should dedupe files', () => {
      yml = `
version: '2'
services:
  web:
    extends:
       file: common.yml
  db:
    image: postgres
  api:
    extends:
       file: common.yml
`
      DockerComposeParser.findExtendedFiles(yml)
      .tap((paths) => {
        expect(paths.length).to.equal(1)
        expect(paths[0]).to.equal('common.yml')
      })
    })

    it('should return empty array if no extends', () => {
      yml = `
version: '2'
services:
  db:
    image: postgres
  api:
    build: .
`
      DockerComposeParser.findExtendedFiles(yml)
      .tap((paths) => {
        expect(paths.length).to.equal(0)
      })
    })
  })
  describe('#_mergeServices', () => {
    it('should return warning if parent was not found', () => {
      const input = [
        {
          metadata: {
            name: 'api'
          },
          build: '.',
          extends: {
            service: 'api-base'
          }
        }
      ]
      const result = DockerComposeParser._mergeServices(input, {})
      expect(result.results.length).to.equal(1)
      const warnings = result.results[0].warnings._warnings
      expect(warnings.length).to.equal(1)
      expect(warnings[0]).to.deep.equal({
        serviceName: 'api',
        parentServiceName: 'api-base',
        message: 'Parent service is not found'
      })
    })
    it('should merge two services', () => {
      const input = [
        {
          metadata: {
            name: 'api'
          },
          extends: {
            service: 'api'
          },
          instance: {
            env: ['URL=TEST']
          }
        },
        {
          metadata: {
            name: 'api'
          },
          build: '.',
          extends: {},
          instance: {
            env: ['URL=BASE', 'URL2=BASE']
          }
        },
        {
          metadata: {
            name: 'web'
          },
          instance: {
            env: ['URL=BASE', 'URL2=BASE']
          }
        }
      ]
      const result = DockerComposeParser._mergeServices(input, {})
      expect(result.results.length).to.equal(2)
      const api = result.results[0]
      const apiResult = {
        'extends': {
          'service': 'api'
        },
        'instance': {
          'env': [
            'URL=TEST',
            'URL2=BASE'
          ]
        },
        build: '.',
        'metadata': {
          'name': 'api'
        }
      }
      expect(api).to.deep.equal(apiResult)
      const web = result.results[1]
      expect(web).to.deep.equal({
        'instance': {
          'env': [
            'URL=BASE',
            'URL2=BASE'
          ]
        },
        'metadata': {
          'name': 'web'
        }
      })
      expect(result.mains.builds.api).to.deep.equal(apiResult)
    })
  })
})
