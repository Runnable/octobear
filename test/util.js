'use strict'

module.exports.sanitizeName = x => x.replace(/[^a-zA-Z0-9-]/g, '-')
