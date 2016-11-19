'use strict'

module.exports = class Warnings {

  static unsupportedKeys (service, warnings, serviceSchemaKeys) {
    // Throw warning if we have any keys we ignore
    const allowedKeys = Object.keys(serviceSchemaKeys)
    const unsupportedKeys = []
    service = Object.assign({}, service)
    warnings = warnings.slice(0)
    Object.keys(service).forEach(key => {
      if (allowedKeys.indexOf(key) === -1) {
        unsupportedKeys.push(key)
      }
    })
    warnings.push({
      message: 'The following keys specified in this service are not supported',
      keys: unsupportedKeys
    })
    return [service, warnings]
  }

  static buildAndImage (service, warnings) {
    service = Object.assign({}, service)
    warnings = warnings.slice(0)
    if (service.build && service.image) {
      warnings.push({
        message: 'The `image` has been ignored since a `build` was provided',
        image: service.images
      })
      delete service.image
    }
    return [service, warnings]
  }

}
