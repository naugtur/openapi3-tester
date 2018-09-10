'use strict'
const p = require('bluebird')
const request = p.promisify(require('request'))
const should = require('should')
const ChowChow = require('oas3-chow-chow').default
const debug = require('debug')('openapi3-tester')

module.exports = {
  use (definition) {
    const chow = new ChowChow(definition)

    should.Assertion.add('chowValidResponse', function (input) {
      this.params = {
        operator: `to be a valid API response with status ${
          input.expectedStatus
        }`
      }

      const status = this.obj.statusCode
      const responseCore = {
        method: this.obj.request.method,
        status: '' + this.obj.statusCode,
        header: this.obj.headers,
        body: this.obj.body
      }
      const path = input.path
      this.obj = responseCore
      if (input.expectedStatus) {
        status.should.eql(input.expectedStatus)
      }
      try {
        input.chow.validateResponse(path, responseCore)
      } catch (e) {
        debug('raw validator error', e)
        if (e.meta) {
          var errors = e.meta.rawErrors
          if (Array.isArray(errors)) {
            errors = errors.map(re => re.error).join('\n')
          }
          this.params = {
            operator:
              'to be a valid API response. ' +
              e.message +
              ':\n' +
              errors
          }
        } else {
          this.params = {
            operator: 'to validate correctly. Got error: ' + e.message
          }
        }
        return this.assert(false)
      }
      return this.assert(true)
    })

    return {
      test (options) {
        const baseUrl = options.url || definition.servers[0].url

        return p
          .try(() => {
            if (!options.badRequest) {
              chow.validateRequest(options.path, options.reqOptions)
            }
          })
          .then(() => {
            const opts = Object.assign(
              {
                uri: `${baseUrl}${options.path}`
              },
              options.reqOptions
            )
            debug('request options', opts)
            return request(opts)
          })
          .then(response => {
            debug('response', {
              headers: response.headers,
              body: response.body,
              statusCode: response.statusCode
            })
            try {
              response.body = JSON.parse(response.body)
            } catch (e) {}
            if (!response.headers['content-type']) {
              throw Error('No content-type header in response')
            }
            response.headers['content-type'] = response.headers['content-type'].split(';')[0]

            if (options.badRequest && !options.expectedStatus) {
              response.statusCode.should.be.aboveOrEqual(400)
            }

            response.should.be.chowValidResponse({
              expectedStatus: options.expectedStatus,
              chow,
              path: options.path
            })

            return response
          })
      }
    }
  }
}
