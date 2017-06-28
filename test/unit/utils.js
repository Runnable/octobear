'use strict'
const { expect } = require('chai')
const Joi = require('joi')

const Utils = require('../../lib/util')
const schema = Joi.object({ name: Joi.string() })

describe('Util', () => {
  describe('validate', () => {
    it('should throw an error if the schema is not valid', done => {
      Utils.validate(schema, { hello: 'world' })
        .asCallback(err => {
          expect(err).to.exist
          expect(err.message).to.match(/docker-compose.*invalid/)
          done()
        })
    })

    it('should not throw an error if the schema is valid', done => {
      Utils.validate(schema, { name: 'world' })
        .asCallback(err => {
          expect(err).not.to.exist
          done()
        })
    })
  })
})
