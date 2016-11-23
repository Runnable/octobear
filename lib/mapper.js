'use strict'

module.exports = class Mapper {

  static mapKeyValueObjectToArray (value) {
    if (!Array.isArray(value) && typeof value === 'object') {
      return Object.keys(value).map(key => {
        return `${key}=${value[key]}`
      })
    }
    return value
  }

}
