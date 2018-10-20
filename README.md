# swagger-parse-flowtyped

## Usage

```js
const swagger = require('swagger-parse-flowtyped')(swaggerJson);
swagger.methods.forEach(method => {
    method.parameters.forEach(parameter => {
        console.log(parameter.flowType);
    });
});
```

## Installation

```sh
yarn add swagger-parse-flowtyped
```

## Credit

* https://github.com/chenweiqun/swagger-vue
