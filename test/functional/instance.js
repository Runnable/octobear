'use strict'
const createInstancesFromComposeFile = require('index')
const { createContextVersionAndInstance } = require('./util')
const fs = require('fs')

xdescribe('1. Instance', () => {
  describe('1.1', () => {
    const dockerComposeFile = fs.readFileSync('../compose-files/1.1.yml')
    it('should create an instance with a simple Dockerfile', () => {
      return createInstancesFromComposeFile(dockerComposeFile.toString())
      .then(({ results: [{ contextVersion }] }) => {
        return createContextVersionAndInstance(contextVersion, {})
      })
    })
  })
})
