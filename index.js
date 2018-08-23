'use strict'
const p = require('bluebird')
const request = p.promisify(require('request'))
const should = require('should')
const ChowChow = require('oas3-chow-chow').default

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
        console.log(e)
        if (e.meta) {
          this.params = {
            operator:
              'to be a valid API response. ' +
              e.message +
              ':\n' +
              e.meta.rawErrors.map(re => re.error).join('\n')
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
          .then(() =>
            request(
              Object.assign(
                {
                  uri: `${baseUrl}${options.path}`
                },
                options.reqOptions
              )
            )
          )
          .then(response => {
            try {
              response.body = JSON.parse(response.body)
            } catch (e) {}
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
