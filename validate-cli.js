#!/usr/bin/env node

const args = process.argv.slice(2)
if(!args[0]){
  console.log('Usage: validate-openapi3 definitionFile.json')
  process.exit(1)
}
const definition = JSON.parse(require('fs').readFileSync(args[0]))
const tester = require('./index')
tester.use(definition)
console.log("validation finished")