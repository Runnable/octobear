'use strict'
const expect = require('chai').expect

const Parser = require('parser')

describe('Parser', () => {
  describe('#buildDockerfilePathParser', () => {
  })

  describe('#portsParser', () => {
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
