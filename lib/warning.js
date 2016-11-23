'use strict'

module.exports = class Warnings {

  constructor () {
    this._warnings = []
  }

  /**
   * Add new warning
   *
   * @param {String} message
   * @param {Object} metadata - Arbitrary metadata
   */
  add (message, metadata) {
    this._warnings.push(Object.assign({}, metadata, { message }))
  }

  *[Symbol.iterator] () {
    for (var item of this._warnings) {
      yield item
    }
  }

  /**
   * Warning generator for detecting unsupported keys in docker-compose file
   *
   * @param {Object}    service
   * @param {Object}    warnings          - Warnings object
   * @param {Object}    serviceSchemaKeys - Object with all supported keys
   * @return {Object}                     - Return copy of object
   */
  static unsupportedKeys (service, warnings, serviceSchemaKeys) {
    const allowedKeys = Object.keys(serviceSchemaKeys)
    const unsupportedKeys = []
    const serviceCopy = Object.assign({}, service)
    Object.keys(serviceCopy).forEach(key => {
      if (allowedKeys.indexOf(key) === -1) {
        unsupportedKeys.push(key)
      }
    })
    warnings.add('The following keys specified in this service are not supported', { keys: unsupportedKeys })
    return serviceCopy
  }

  /**
   * Warning generator for detecting if `build` and `image` are both used
   *
   * @param {Object}    service
   * @param {Object}    warnings          - Warnings object
   * @return {Object}                     - Return copy of object
   */
  static buildAndImage (service, warnings) {
    const serviceCopy = Object.assign({}, service)
    if (serviceCopy.build && serviceCopy.image) {
      warnings.add('The `image` has been ignored since a `build` was provided', { image: serviceCopy.images })
      delete serviceCopy.image
    }
    return serviceCopy
  }

}
