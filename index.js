'use strict'
const forIn = require('lodash.forin')
const fetch = require('node-fetch')
const should = require('should')
const ChowChow = require('oas3-chow-chow').default
const debug = require('debug')('openapi3-tester')
const util = require('util')

const TOTAL_KEY = '::total::'

const OpenapiSchemaValidator = require('openapi-schema-validator').default || require('openapi-schema-validator')
const validator = new OpenapiSchemaValidator({
  version: 3
})

module.exports = {
  use (definition) {
    const validationResult = validator.validate(definition)
    if (validationResult.errors && validationResult.errors.length > 0) {
      const err = Error(
        'definition was not valid \n' +
          util.inspect(validationResult, { depth: Infinity, colors: true })
      )
      err.validation = validationResult.errors
      throw err
    }
    const chow = new ChowChow(definition)

    const coverage = indexDefinitionForCoverage(definition)

    should.Assertion.add('chowValidResponse', function (input) {
      this.params = {
        operator: `to be a valid API response with status ${
          input.expectedStatus
        }`
      }

      const status = this.obj.status
      const responseCore = {
        // method: input.method,
        status: '' + this.obj.status,
        header: this.obj.headers,
        body: this.obj.body
      }
      const path = input.path
      this.obj = responseCore
      if (input.expectedStatus) {
        should(status).eql(input.expectedStatus)
      }
      try {
        if (input.operationId) {
          input.chow.validateResponseByOperationId(input.operationId, responseCore)
        } else {
          input.chow.validateResponseByPath(path, input.method, responseCore)
        }
      } catch (e) {
        debug('raw validator error', e)
        if (e.meta) {
          var errors = e.meta.rawErrors
          if (Array.isArray(errors)) {
            errors = errors.map(re => re.error).join('\n')
          }
          this.params = {
            operator:
              'to be a valid API response. ' + e.message + ':\n' + errors
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
        const url = new URL(`${baseUrl}${options.path}`)
        if (options.reqOptions.qs) {
          Object.keys(options.reqOptions.qs).map(k => {
            url.searchParams.set(k, options.reqOptions.qs[k])
          })
        }

        return Promise.resolve()
          .then(() => {
            if (!options.badRequest) {
              if (options.operationId) {
                chow.validateRequestByOperationId(
                  options.operationId,
                  Object.assign(
                    {
                      header: options.reqOptions.headers
                    },
                    options.reqOptions
                  )
                )
              } else {
                chow.validateRequestByPath(
                  options.path,
                  options.reqOptions.method || 'get',
                  Object.assign(
                    {
                      header: options.reqOptions.headers

                    },
                    options.reqOptions
                  )
                )
              }
            }
          })
          .then(() => {
            coverage.mark(options.path, options.reqOptions.method, options.expectedStatus)

            debug('request options', options.reqOptions)
            return fetch(url.toString(), options.reqOptions)
          })
          .then(response => {
            debug('response', response)
            return response.json()
              .then(body => {
                return {
                  headers: response.headers,
                  url: response.url,
                  body: body,
                  status: response.status
                }
              }, err => {
                debug('response parsing error', err)
                return response
              })
          })
          .then(response => {
            response.headers['content-type'] =
              response.headers['content-type'] &&
              response.headers['content-type'].split(';')[0]

            if (options.badRequest && !options.expectedStatus) {
              response.status.should.be.aboveOrEqual(400)
            }

            should(response).be.chowValidResponse({
              method: options.reqOptions.method,
              operationId: options.operationId,
              expectedStatus: options.expectedStatus,
              chow,
              path: options.path
            })

            return response
          })
      },
      getCoverage () {
        return coverage.data
      },
      getCoverageNumbers () {
        return coverage.data.reduce((mem, data) => {
          mem[data.key] = data.matchingCalls
          if (!data.key.match(/default$/)) {
            mem[TOTAL_KEY].all++
            mem[TOTAL_KEY].checked += (data.matchingCalls ? 1 : 0)
            mem[TOTAL_KEY].percent = Math.floor(100 * mem[TOTAL_KEY].checked / mem[TOTAL_KEY].all)
          }
          return mem
        }, { [TOTAL_KEY]: { all: 0, checked: 0, percent: 0 } })
      }
    }
  }
}

const separator = '->'
function indexKey (path, method, code) {
  return `${path}${separator}${method}${separator}${code}`
}
function indexDefinitionForCoverage (definition) {
  const index = []
  forIn(definition.paths, (path, pathName) => {
    forIn(path, (method, methodName) => {
      forIn(method.responses, (response, code) => {
        const key = indexKey(pathName, methodName, code)
        index.push({
          key: key,
          matchingCalls: 0,
          // I didn't feel comfortable with this RegExp idea either, but that feeling passes ;)
          matcher: RegExp(indexKey(pathName.replace(/{[a-z0-9]*}/gi, '[^/]*') + '(/)?', methodName, code.replace('default', '.*')))
        })
      })
    })
  })

  return {
    data: index,
    mark (path, method, code) {
      const key = indexKey(path, method, code)

      index.forEach(entry => {
        if (entry.matcher.test(key)) {
          entry.matchingCalls++
        }
      })
    }
  }
}
