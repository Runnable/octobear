'use strict'
const Promise = require('bluebird')

module.exports = class Utils {

  static removeNullAndUndefinedKeys (obj) {
    const newObject = Object.assign({}, obj)
    Object.keys(newObject).forEach(key => {
      const value = obj[key]
      if (value === undefined || value === null) {
        delete newObject[key]
      }
    })
    return newObject
  }

  static validate (schema, payload) {
    return Promise.fromCallback(cb => {
      schema.validate(payload, cb)
    })
    .catch(err => {
      throw new Error(`Your docker-compose file is invalid: ${err.toString}`, {
        payload
      })
    })
  }
}

