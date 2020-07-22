const apiTester = require('./index')
const definition = require('./exampleDefinition')
const assert = require('assert')
const API = apiTester.use(definition)

describe('test api', () => {
  it('should handle a successful call', () =>
    API.test({
      path: '/pet/1',
      reqOptions: {
        headers: { accept: 'application/json' },
        qs: {
          q: '"&"'
        },
        method: 'get'
      },
      expectedStatus: 200
    }).then(response=>{
      response.url.split('?')[1].should.eql('q=%22%26%22')
    }))

  it('should handle a successful call without response body', () =>
    API.test({
      path: '/pet/1',
      reqOptions: {
        headers: { 'accept': 'application/json',  'content-type': 'application/x-www-form-urlencoded' },
        method: 'post',
        body: new URLSearchParams({
          "id": 1,
          "name": 'fafik',
          "tag": 'yes'
        }).toString()
      },
      expectedStatus: 200
    }))
    
  it('should report request body schema errors', () =>
    API.test({
      path: '/pet/2',
      reqOptions: {
        headers: { accept: 'application/json' },
        method: 'post',
        body: {
          "name": 'fafik',
        }
      },
      expectedStatus: 200
    }).should.be.rejectedWith(/RequestValidationError/gi))

  it('should handle a good request producing failure', () =>
    API.test({
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
    API.test({
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

  it('should provide coverage report', ()=>{
    console.log(API.getCoverage())
    const nums = API.getCoverageNumbers()
    console.log(nums)
    nums['/pet/{petId}->get->200'].should.eql(1)
    nums['/pet->get->200'].should.eql(0)
    nums['/pet/{petId}->post->200'].should.eql(1)
  })
})

describe('validation', () => {
  const definition1 = require('./badDefinitions/exampleDefinition.1.json')
  const definition2 = require('./badDefinitions/exampleDefinition.2.json')
  it('should find chowchow detectable errors', () =>
    assert.throws(()=>apiTester.use(definition1)))
    
    it('should find errors with the validator', () => 
    assert.throws(()=>apiTester.use(definition2)))
})
