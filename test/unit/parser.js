'use strict'
const expect = require('chai').expect

const Parser = require('parser')
const Warning = require('warning')

describe('Parser', () => {
  describe('#dockerBuildParser', () => {
    let warnings
    let build
    let scmDomain
    beforeEach(() => {
      build = '.'
      scmDomain = 'github.com'
      warnings = new Warning()
    })

    it('should return `null` if there is no build', () => {
      build = null
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result).to.equal(null)
    })

    it('should throw a warning if build args are passed', () => {
      build = { args: ['WOW=1'], context: '/src' }
      Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(Array.from(warnings)[0].args).to.deep.equal(['WOW=1'])
    })

    it('should return `/Dockerfile` if passed "/src"', () => {
      build = { args: ['WOW=1'], context: '/src' }
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result.dockerFilePath).to.equal('/src/Dockerfile')
    })

    it('should return correct context if passed "/src"', () => {
      build = { args: ['WOW=1'], context: '/src' }
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result.dockerBuildContext).to.equal('/src')
    })

    it('should return `/Dockerfile`', () => {
      build = { context: '/src/deep/wow' }
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result.dockerFilePath).to.equal('/src/deep/wow/Dockerfile')
      expect(result.dockerBuildContext).to.equal('/src/deep/wow')
    })

    it('should return `Dockerfile` for github url', () => {
      build = 'git@github.com/DockerCon2017/api.git'
      scmDomain = 'github.com'
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result.dockerFilePath).to.equal('/Dockerfile')
      expect(result.dockerBuildContext).to.equal(undefined)
    })

    it('should return full url for non supported scm doman', () => {
      build = 'git@github.com/DockerCon2017/api.git'
      scmDomain = 'bitbucket.org'
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result.dockerFilePath).to.equal('/git@github.com/DockerCon2017/api/Dockerfile')
      expect(result.dockerBuildContext).to.equal('git@github.com/DockerCon2017/api')
    })

    it('should return `/src/deep/wow/wow-thats-awesome.Dockerfile`', () => {
      build = { context: '/src/deep/wow', dockerfile: 'wow-thats-awesome.Dockerfile' }
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result.dockerFilePath).to.equal('/src/deep/wow/wow-thats-awesome.Dockerfile')
      expect(result.dockerBuildContext).to.equal('/src/deep/wow')
    })

    it('should return `/Dockerfile`', () => {
      build = { context: 'https://github.com/Runnable/node-starter' }
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result.dockerFilePath).to.equal('/Dockerfile')
      expect(result.dockerBuildContext).to.equal(undefined)
    })

    it('should return `/wow-thats-awesome.Dockerfile`', () => {
      build = { context: 'https://github.com/Runnable/node-starter', dockerfile: 'wow-thats-awesome.Dockerfile' }
      const result = Parser.dockerBuildParser({ build, scmDomain, warnings })
      expect(result.dockerFilePath).to.equal('/wow-thats-awesome.Dockerfile')
      expect(result.dockerBuildContext).to.equal(undefined)
    })
  })

  describe('#buildRemoteCodeParser', () => {
    let warnings
    let build
    let scmDomain
    beforeEach(() => {
      build = '.'
      scmDomain = 'github.com'
      warnings = new Warning()
    })

    it('should return `null` if there is no build', () => {
      build = null
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.equal(null)
    })

    it('should throw a warning if build args are passed', () => {
      build = { args: ['WOW=1'], context: 'https://github.com/Runnable/node-starter' }
      Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(Array.from(warnings)[0].args).to.deep.equal(['WOW=1'])
    })

    it('should return `undefined` if non github url', () => {
      build = { args: ['WOW=1'], context: 'hello' }
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.equal(undefined)
    })

    it('should return `undefined` if non github url', () => {
      build = 'hello'
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.equal(undefined)
    })

    it('should return `Runnable/node-starter` for github url', () => {
      build = { context: 'https://github.com/Runnable/node-starter' }
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.deep.equal({
        repo: 'Runnable/node-starter',
        commitish: null
      })
    })

    it('should return `Runnable/node-starter` and `feature1` for github url with branch', () => {
      build = { context: 'https://github.com/Runnable/node-starter#feature1' }
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.deep.equal({
        repo: 'Runnable/node-starter',
        commitish: 'feature1'
      })
    })

    it('should return `Runnable/node-starter` for github url as build', () => {
      build = 'https://github.com/Runnable/node-starter'
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.deep.equal({
        repo: 'Runnable/node-starter',
        commitish: null
      })
    })

    it('should return `Runnable/node-starter` for git url', () => {
      build = { context: 'git@github.com:Runnable/node-starter.git' }
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.deep.equal({
        repo: 'Runnable/node-starter',
        commitish: null
      })
    })

    it('should return `Runnable/node-starter` for git url as build', () => {
      build = 'git@github.com:Runnable/node-starter.git'
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.deep.equal({
        repo: 'Runnable/node-starter',
        commitish: null
      })
    })

    it('should return `Runnable/node-starter` and `feature1` for git url with branch', () => {
      build = { context: 'git@github.com:Runnable/node-starter.git#feature1' }
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.deep.equal({
        repo: 'Runnable/node-starter',
        commitish: 'feature1'
      })
    })

    it('should return `Runnable/node-starter` and `feature1`', () => {
      build = 'https://github.com/Runnable/node-starter#feature1'
      const result = Parser.buildRemoteCodeParser({ build, scmDomain, warnings })
      expect(result).to.deep.equal({
        repo: 'Runnable/node-starter',
        commitish: 'feature1'
      })
    })
  })
  describe('#portsParser', () => {
    let warnings
    let ports
    beforeEach(() => {
      ports = ['80']
      warnings = new Warning()
    })

    it('should return an empty array if no ports are passed', () => {
      ports = null
      const result = Parser.portsParser({ ports, warnings })
      expect(result).to.deep.equal([])
    })

    it('should add ports that are numbers', () => {
      const badPort = '9000'
      ports.push(badPort)
      const result = Parser.portsParser({ ports, warnings })
      expect(result).to.deep.equal([80, 9000])
    })

    it('should not add ports that are not numbers', () => {
      const badPort = 'asdfasd'
      ports.push(badPort)
      const result = Parser.portsParser({ ports, warnings })
      expect(result).to.deep.equal([80])
      let warningsArray = Array.from(warnings)
      expect(warningsArray).to.have.lengthOf(1)
      expect(warningsArray[0].port).to.equal(badPort)
    })

    it('should add ports with a colon (80:80)', () => {
      const badPort = '9000:9000'
      ports.push(badPort)
      const result = Parser.portsParser({ ports, warnings })
      expect(result).to.deep.equal([80, 9000])
    })

    it('should throw a warning for an unsupported port (9000:80)', () => {
      const badPort = '9000:5000'
      ports.push(badPort)
      const result = Parser.portsParser({ ports, warnings })
      expect(result).to.deep.equal([80])
      let warningsArray = Array.from(warnings)
      expect(warningsArray).to.have.lengthOf(1)
      expect(warningsArray[0].ports).to.deep.equal(['9000', '5000'])
    })
  })

  describe('#envReplacementParser', () => {
    it('should return the ENV even if it doesnt have `=`', () => {
      const env = ['EMPIRE_DATABASE_URL']
      const result = Parser.envReplacementParser({ env, hostnames: [], links: [] })
      expect(result[0]).to.equal(`EMPIRE_DATABASE_URL`)
    })

    it('should replace the host if directly passed', () => {
      const env = ['EMPIRE_DATABASE_URL=postgres']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { postgres: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['postgres'] })
      expect(result[0]).to.equal(`EMPIRE_DATABASE_URL=${newHost}`)
    })

    it('should replace the host if passed in an http address', () => {
      const env = ['EMPIRE_DATABASE_URL=http://postgres:80/']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { postgres: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['postgres'] })
      expect(result[0]).to.equal(`EMPIRE_DATABASE_URL=http://${newHost}:80/`)
    })

    it('should not replace the host if set inside another word', () => {
      const env = ['EMPIRE_DATABASE_URL=ppppostgressss']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { postgres: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['postgres'] })
      expect(result[0]).to.equal(`EMPIRE_DATABASE_URL=ppppostgressss`)
    })

    it('should correctly replace a postgres host', () => {
      const env = ['EMPIRE_DATABASE_URL=postgres://postgres:postgres@postgres/postgres?sslmode=disable']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { postgres: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['postgres'] })
      expect(result[0]).to.equal(`EMPIRE_DATABASE_URL=postgres://postgres:postgres@${newHost}/postgres?sslmode=disable`)
    })

    it('should correctly replace a postgres host', () => {
      const env = ['SENTRY_DSN=https://5f31608fe1c24d2cbbf384e412c0e8c3:77adde0716644851b8d963af9d8b753e@sentry.io/98425']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { 'sentry.io': newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['sentry.io'] })
      expect(result[0]).to.equal(`SENTRY_DSN=https://5f31608fe1c24d2cbbf384e412c0e8c3:77adde0716644851b8d963af9d8b753e@${newHost}/98425`)
    })

    it('should correctly replace a postgres host', () => {
      const env = ['ZOOKEEPER=zookeeper:2181']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { zookeeper: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['zookeeper'] })
      expect(result[0]).to.equal(`ZOOKEEPER=${newHost}:2181`)
    })

    it('should correctly replace a postgres host', () => {
      const env = ['DB_CONNECTION_STRING=postgresql://uber_db:uber_db@rams_db:5432/uber_db']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { rams_db: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['rams_db'] })
      expect(result[0]).to.equal(`DB_CONNECTION_STRING=postgresql://uber_db:uber_db@${newHost}:5432/uber_db`)
    })

    it('should not append a trailing slash in http URLs', () => {
      const env = ['SEARCH_URL=http://search:9200']
      const newHost = 'compose-test-search-staging-runnabletest.runnable.ninja'
      const hostnames = { search: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['search'] })
      expect(result[0]).to.equal(`SEARCH_URL=http://${newHost}:9200`)
    })

    it('should not remove a trailing slash that already exists', () => {
      const env = ['SEARCH_URL=http://search:9200/']
      const newHost = 'compose-test-search-staging-runnabletest.runnable.ninja'
      const hostnames = { search: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['search'] })
      expect(result[0]).to.equal(`SEARCH_URL=http://${newHost}:9200/`)
    })
  })
})
