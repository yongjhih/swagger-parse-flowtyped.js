#!/usr/bin/env node
const parse = require('./lib/parse.js');
const codegen = require('./lib/codegen.js');
const fs = require('fs-extra');
const stdin = require('get-stdin');

require('yargs')
  .command('*', 'Generate', (yargs2) => {
  }, (argv) => {
      return stdin().then(str => JSON.parse(str)).then(str => {
          console.log(str);
          console.log(codegen(parse({
              swagger: str,
              moduleName: 'swagger',
              className: 'swagger'
          })));
      });
  })
  .option('verbose', {
    alias: 'v',
    default: false
  })
  .option('h', {
    alias: 'help',
    description: 'display help message'
  })
  .help('help')
  .fail((msg, err) => {
    console.log(msg);
    console.error(err);
  }).argv;
