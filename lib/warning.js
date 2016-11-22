'use strict'

module.exports = class Warnings {

  static unsupportedKeys (service, warnings, serviceSchemaKeys) {
    const allowedKeys = Object.keys(serviceSchemaKeys)
    const unsupportedKeys = []
    const serviceCopy = Object.assign({}, service)
    warnings = warnings.slice(0)
    Object.keys(serviceCopy).forEach(key => {
      if (allowedKeys.indexOf(key) === -1) {
        unsupportedKeys.push(key)
      }
    })
    warnings.push({
      message: 'The following keys specified in this service are not supported',
      keys: unsupportedKeys
    })
    return [serviceCopy, warnings]
  }

  static buildAndImage (service, warnings) {
    const serviceCopy = Object.assign({}, service)
    warnings = warnings.slice(0)
    if (serviceCopy.build && serviceCopy.image) {
      warnings.push({
        message: 'The `image` has been ignored since a `build` was provided',
        image: serviceCopy.images
      })
      delete serviceCopy.image
    }
    return [serviceCopy, warnings]
  }

}
