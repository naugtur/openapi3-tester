# openapi3-tester
Simple customizable testing for APIs defined with OpenAPI v3 spec

[![npm](https://img.shields.io/npm/v/openapi3-tester.svg?style=flat)](https://www.npmjs.com/package/openapi3-tester)

Leaves choosing what to send and what details to assert to you while automating all validations against the OpenAPI spec.

> Closest thing to automatically-generated test suite that still makes sense long term

## Install

```
npm i --save-dev openapi3-tester
```

## Features

- validates input for tests, so tests can't remain outdated when API specification changes
- automatically tests response for the expected status
- allows a human to specify input so failing cases are easier to do than with a test generator
- `reqOptions` is passed to `fetch` (node-fetch package), so there's no limit to the complexity of requests to test
- supports non-standard field `qs` in `reqOptions` because come on, fetch...
- tracks coverge of the API definition

## Usage

see `test.js` for an example

```js
const API = apiTester.use(definition)

describe('test api', () => {
  it('should handle a successful call', () =>
    API.test({
      path: '/pet/1',
      reqOptions: {
        headers: { accept: 'application/json' },
        qs: {
          search: "dog"
        },
        method: 'get'
      },
      expectedStatus: 200
    }))
    
  it('should handle invalid input', () =>
    API.test({
      path: '/pet/ohnoerror',
      badRequest: true, // skip input validation
      reqOptions: {
        headers: { accept: 'application/json' },
        qs: {},
        method: 'get'
      },
      expectedStatus: 404
    }).then(response => {
      // optionally assert on response fields
      response.body.should.have.property('message')
    }))


    after(()=>{
        console.log(API.getCoverageNumbers())
    })
})
```

### Coverage

API tester has a tiny coverage tracking feature. It's very basic, but should be helpful in tracking which endpoints are missing a test.

`API.getCoverageNumbers()` lists entries from the definition and the number of calls in teests that matched the definition.  
Warning: `default` as response code will match all calls to that path and method, even if matching code is defined separately.

To get an insight into how coverage was matched to request, call `API.getCoverage()` and see the matchers.