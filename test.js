const apiTester = require('./index')
const definition = require('./exampleDefinition')

const testAPI = apiTester.use(definition).test

describe('test api', () => {

  it('should handle a successful call', () =>
    testAPI({
      path: '/pet/1',
      reqOptions: {
        headers: { accept: 'application/json' },
        qs: {},
        method: 'get'
      },
      expectedStatus: 200
    }))

  it('should handle a good request producing failure', () =>
    testAPI({
      path: '/pet/121242341231123',
      reqOptions: {
        headers: { accept: 'application/json' },
        qs: {},
        method: 'get'
      },
      expectedStatus: 404
    }).then(response => {
      response.body.should.have.property('message')
    }))

  it('should handle invalid input', () =>
    testAPI({
      path: '/pet/ohnoerror',
      badRequest: true,
      reqOptions: {
        headers: { accept: 'application/json' },
        qs: {},
        method: 'get'
      },
      expectedStatus: 404
    }).then(response => {
      response.body.should.have.property('message')
    }))
    
})
