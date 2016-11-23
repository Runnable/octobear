'use strict'
const expect = require('chai').expect

const Parser = require('parser')

describe('Parser', () => {
  describe('#buildDockerfilePathParser', () => {
    let warnings
    let build
    beforeEach(() => {
      build = '.'
      warnings = []
    })

    it('should return `null` if there is no build', () => {
      build = null
      const result = Parser.buildDockerfilePathParser({ build, warnings })
      expect(result).to.equal(null)
    })

    it('should throw a warning if build args are passed', () => {
      build = { args: ['WOW=1'], context: '/src' }
      Parser.buildDockerfilePathParser({ build, warnings })
      expect(warnings[0].args).to.deep.equal(['WOW=1'])
    })

    it('should return `/Dockerfile` if passed "."', () => {
      build = { args: ['WOW=1'], context: '/src' }
      const result = Parser.buildDockerfilePathParser({ build, warnings })
      expect(result).to.equal('/src/Dockerfile')
    })

    it('should return `/src/deep/wow/Dockerfile`', () => {
      build = { context: '/src/deep/wow' }
      const result = Parser.buildDockerfilePathParser({ build, warnings })
      expect(result).to.equal('/src/deep/wow/Dockerfile')
    })

    it('should return `/src/some-other-name.Dockerfile`', () => {
      build = { context: '/src/deep/wow', dockerfile: 'wow-thats-awesome.Dockerfile' }
      const result = Parser.buildDockerfilePathParser({ build, warnings })
      expect(result).to.equal('/src/deep/wow/wow-thats-awesome.Dockerfile')
    })
  })

  describe('#portsParser', () => {
    let warnings
    let ports
    beforeEach(() => {
      ports = ['80']
      warnings = []
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
      expect(warnings).to.have.lengthOf(1)
      expect(warnings[0].port).to.equal(badPort)
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
      expect(warnings).to.have.lengthOf(1)
      expect(warnings[0].ports).to.deep.equal(['9000', '5000'])
    })
  })

  describe('#envReplacementParser', () => {
    it('should replace the host if directly passed', () => {
      const env = ['EMPIRE_DATABASE_URL=postgres']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { postgres: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['postgres'] })
      expect(result[0]).to.equal(`EMPIRE_DATABASE_URL=${newHost}`)
    })

    it('should replace the host if passed in an http address', () => {
      const env = ['EMPIRE_DATABASE_URL=http://postgres:80']
      const newHost = 'compose-test-repo-3-2-db-staging-runnabletest.runnable.ninja'
      const hostnames = { postgres: newHost }
      const result = Parser.envReplacementParser({ env, hostnames, links: ['postgres'] })
      expect(result[0]).to.equal(`EMPIRE_DATABASE_URL=http://${newHost}:80`)
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
  })
})
