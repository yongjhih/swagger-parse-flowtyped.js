const parse = require('./lib/parse.js');
const codegen = require('./lib/codegen.js');
const fs = require('fs');
const path = require('path');
const jsonData = require('./swagger.json');

fs.writeFileSync(path.join(__dirname, 'swagger.js'), codegen(parse({
    swagger: jsonData,
    moduleName: 'swagger',
    className: 'swagger'
})));
