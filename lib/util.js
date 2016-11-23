'use strict'
const Promise = require('bluebird')

module.exports = class Utils {

  /**
   * Remove all null and undefined values in object. Shallow check.
   *
   * @param {Object}
   * @return {Object} - Shallow of object without keys/values
   */
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

  /**
   * Validate payload against Joi schema
   *
   * @param {Object}   schema  - Joi schema
   * @param {Object}   payload - Payload to validate
   * @return {Promise}         - Returns payload
   * @throw {Error}            - Throw error if validation does not pass
   */
  static validate (schema, payload) {
    return Promise.fromCallback(cb => {
      schema.validate(payload, cb)
    })
    .catch(err => {
      throw new Error(`Your docker-compose file is invalid: ${err.toString()}`, {
        payload
      })
    })
  }
}

