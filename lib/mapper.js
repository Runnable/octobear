'use strict'

module.exports = class Mapper {

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
   * Map key:value object to array with `key=value`
   *
   * @param {Object} value - Object with key values { DB: 'hello', ... }
   * @return {Array}       - Array of Strings
   */
  static mapKeyValueObjectToArray (obj) {
    if (!Array.isArray(obj) && typeof obj === 'object') {
      return Object.keys(obj).map(key => {
        return `${key}=${obj[key]}`
      })
    }
    return obj
  }

}
