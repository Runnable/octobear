'use strict'

module.exports = class Mapper {

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
