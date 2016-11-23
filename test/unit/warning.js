'use strict'
const sinon = require('sinon')

const Warning = require('warning')

describe('Warning', () => {
  describe('buildAndImage', () => {
    let warnings
    beforeEach(() => {
      warnings = { add: sinon.stub() }
    })

    it('should add a warning if there is a build and an image', () => {
      Warning.buildAndImage({ image: 'image', build: 'build' }, warnings)
      sinon.assert.calledOnce(warnings.add)
      sinon.assert.calledWith(warnings.add, 'The `image` has been ignored since a `build` was provided', { image: 'image' })
    })

    it('should add a warning if there is just a build', () => {
      Warning.buildAndImage({ build: 'build' }, warnings)
      sinon.assert.notCalled(warnings.add)
    })
  })
})
