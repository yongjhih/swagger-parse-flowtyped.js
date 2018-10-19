'use strict'
let _ = require('lodash')
const faker = require('faker');
let normalizeName = function (id) {
  /* eslint-disable */
  return id.replace(/\.|\-|\{|\}/g, '_').split(" ").join("_")
  /* eslint-enable */
}

let getPathToMethodName = function (opts, m, path) {
  if (path === '/' || path === '') {
    return m
  }

  // clean url path for requests ending with '/'
  let cleanPath = path.replace(/\/$/, '')

  let segments = cleanPath.split('/').slice(1)
  segments = _.transform(segments, function (result, segment) {
    if (segment[0] === '{' && segment[segment.length - 1] === '}') {
      segment = 'by' + segment[1].toUpperCase() + segment.substring(2, segment.length - 1)
    }
    result.push(segment)
  })
  let result = _.camelCase(segments.join('-'))
  return m.toLowerCase() + result[0].toUpperCase() + result.substring(1)
}

let getViewForSwagger2 = function (opts) {
  let swagger = opts.swagger
  let authorizedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'COPY', 'HEAD', 'OPTIONS', 'LINK', 'UNLIK', 'PURGE', 'LOCK', 'UNLOCK', 'PROPFIND']
  let data = {
    description: swagger.info.description,
    isSecure: swagger.securityDefinitions !== undefined,
    moduleName: opts.moduleName,
    className: opts.className,
    imports: opts.imports,
    domain: (swagger.schemes && swagger.schemes.length > 0 && swagger.host && swagger.basePath) ? swagger.schemes[0] + '://' + swagger.host + swagger.basePath.replace(/\/+$/g, '') : '',
    methods: [],
    definitions: [],
    specs: [],
  }

  _.forEach(swagger.paths, function (api, path) {
    let globalParams = []
    /**
     * @param {Object} op - meta data for the request
     * @param {string} m - HTTP method name - eg: 'get', 'post', 'put', 'delete'
     */
    _.forEach(api, function (op, m) {
      if (m.toLowerCase() === 'parameters') {
        globalParams = op
      }
    })
    _.forEach(api, function (op, m) {
      if (authorizedMethods.indexOf(m.toUpperCase()) === -1) {
        return
      }
      let method = {
        path: path,
        _path: path,
        className: opts.className,
        methodName: op.operationId ? normalizeName(op.operationId) : getPathToMethodName(opts, m, path),
        method: m.toUpperCase(),
        isGET: m.toUpperCase() === 'GET',
        isPOST: m.toUpperCase() === 'POST',
        summary: op.description || op.summary,
        tags: op.tags,
        externalDocs: op.externalDocs,
        isSecure: swagger.security !== undefined || op.security !== undefined,
        parameters: [],
        queryParameters: [],
        headers: [],
        responses: op.responses,
        response: op.responses['200'],
        responseType: 'any',
        responseTitle: undefined,
        responseDescription: undefined,
        baseURL: data.domain,
      }

      if (op.produces) {
        let headers = []
        headers.value = []

        headers.name = 'Accept'
        headers.value.push(op.produces.map(function (value) { return '\'' + value + '\'' }).join(', '))

        method.headers.push(headers)
      }

      let consumes = op.consumes || swagger.consumes
      if (consumes) {
        method.headers.push({ name: 'Content-Type', value: '\'' + consumes + '\'' })
      }

      let params = []
      if (_.isArray(op.parameters)) {
        params = op.parameters
      }
      params = params.concat(globalParams)

      _.forEach(params, function (parameter) {
        // Ignore parameters which contain the x-exclude-from-bindings extension
        if (parameter['x-exclude-from-bindings'] === true) {
          return
        }

        // Ignore headers which are injected by proxies & app servers
        // eg: https://cloud.google.com/appengine/docs/go/requests#Go_Request_headers
        if (parameter['x-proxy-header'] && !data.isNode) {
          return
        }
        if (_.isString(parameter.$ref)) {
          let segments = parameter.$ref.split('/')
          parameter = swagger.parameters[segments.length === 1 ? segments[0] : segments[2]]
        }
        parameter.camelCaseName = _.camelCase(parameter.name)
        if (parameter.enum && parameter.enum.length === 1) {
          parameter.isSingleton = true
          parameter.singleton = parameter.enum[0]
        }
        if (parameter.in === 'body') {
          parameter.isBodyParameter = true
        } else if (parameter.in === 'path') {
          parameter.isPathParameter = true
        } else if (parameter.in === 'query') {
          if (parameter['x-name-pattern']) {
            parameter.isPatternType = true
            parameter.pattern = parameter['x-name-pattern']
          }
          parameter.isQueryParameter = true
        } else if (parameter.in === 'header') {
          parameter.isHeaderParameter = true
        } else if (parameter.in === 'formData') {
          parameter.isFormParameter = true
        }

        parameter.cardinality = parameter.required ? '' : '?'
        if (parameter.type === 'number') {
          parameter.flowType = `${parameter.cardinality}number`;
          parameter.fakeValue = `${faker.random.number()}`;
        } else if (parameter.type === 'integer') {
          parameter.flowType = `${parameter.cardinality}number`;
          parameter.fakeValue = `${faker.random.number()}`;
        } else if (parameter.type === 'string') {
          parameter.flowType = `${parameter.cardinality}string`;
          parameter.fakeValue = `"${faker.internet.userName()}"`;
        } else if (parameter.type === 'boolean') {
          parameter.flowType = `${parameter.cardinality}boolean`;
          parameter.fakeValue = `${faker.random.boolean()}`;
        } else {
          parameter.flowType = `${parameter.cardinality}${parameter.type}`;
          if (parameter.required) {
            parameter.fakeValue = `"${faker.internet.userName()}"`;
          }
        }
        method.parameters.push(parameter)
      })

      method.queryParameters = _.filter(method.parameters, parameter => parameter.in === 'query')
      method._path = path.replace(/{/g, '${')
      if (method.responses &&
        method.responses['200'] &&
        method.responses['200'].schema &&
        method.responses['200'].schema["$ref"]) {
        method.responseType = method.responses['200'].schema["$ref"].replace(/^#\/definitions\//, '')
      } else if (method.responses &&
        method.responses['200'] &&
        method.responses['200'].schema &&
        method.responses['200'].schema.type &&
        method.responses['200'].schema.type == "array") {
        method.responseTypeDescription = method.responses['200'].schema.items.description;
        method.responseTypeTitle = method.responses['200'].schema.items.title;
        if (method.responses['200'].schema.items['$ref']) {
          method.responseType = method.responses['200'].schema.items['$ref'].replace(/^#\/definitions\//, '')
        } else if (method.responses['200'].schema.items.type) {
          if (method.responses['200'].schema.items.type === 'integer') {
            method.responseType = "Array<number>";
          } else {
            method.responseType = `Array<${method.responses['200'].schema.items.type}>`;
          }
        }
      }
      data.methods.push(method);
      data.specs.push(method);
    })

  })

  _.forEach(swagger.definitions, function (swaggerDefinition, name) {
    const definition = {
      name: name,
      properties: [],
      description: swaggerDefinition.description,
    }
    _.forEach(swaggerDefinition.properties, (swaggerProperty, propertyName) => {
      const property = {
        type: 'any',
        description: swaggerProperty.description,
      };
      property.name = propertyName;
      property.cardinality = propertyName.includes(swaggerDefinition.required) ? '' : '?';
      if (swaggerProperty.type === 'array') {
        if (swaggerProperty.items.type) {
          if (swaggerProperty.items.type === 'integer') {
            property.type = `Array<${property.cardinality}number>`;
          } else {
            property.type = `Array<${property.cardinality}${swaggerProperty.items.type}>`;
          }
        } else if (swaggerProperty.items['$ref']) {
          property.type = `Array<${property.cardinality}${swaggerProperty.items['$ref'].replace(/^#\/definitions\//, '')}>`;
        }
      } else {
        if (swaggerProperty.type) {
          if (swaggerProperty.type === 'integer') {
            property.type = `${property.cardinality}number`;
          } else {
            property.type = `${property.cardinality}${swaggerProperty.type}`;
          }
        } else if (swaggerProperty['$ref']) {
          property.type = `${property.cardinality}${swaggerProperty['$ref'].replace(/^#\/definitions\//, '')}`;
        }
      }
      definition.properties.push(property);
    });
    data.definitions.push(definition);
  })

  return data
}

let getViewForSwagger1 = function (opts) {
  let swagger = opts.swagger
  let data = {
    description: swagger.description,
    moduleName: opts.moduleName,
    className: opts.className,
    domain: swagger.basePath ? swagger.basePath : '',
    methods: [],
    specs: [],
  }
  swagger.apis.forEach(function (api) {
    api.operations.forEach(function (op) {
      let method = {
        path: api.path,
        className: opts.className,
        methodName: op.nickname,
        method: op.method,
        isGET: op.method === 'GET',
        isPOST: op.method.toUpperCase() === 'POST',
        summary: op.summary,
        parameters: op.parameters,
        headers: []
      }

      if (op.produces) {
        let headers = []
        headers.value = []

        headers.name = 'Accept'
        headers.value.push(op.produces.map(function (value) { return '\'' + value + '\'' }).join(', '))

        method.headers.push(headers)
      }

      op.parameters = op.parameters ? op.parameters : []
      op.parameters.forEach(function (parameter) {
        parameter.camelCaseName = _.camelCase(parameter.name)
        if (parameter.enum && parameter.enum.length === 1) {
          parameter.isSingleton = true
          parameter.singleton = parameter.enum[0]
        }
        if (parameter.paramType === 'body') {
          parameter.isBodyParameter = true
        } else if (parameter.paramType === 'path') {
          parameter.isPathParameter = true
        } else if (parameter.paramType === 'query') {
          if (parameter['x-name-pattern']) {
            parameter.isPatternType = true
            parameter.pattern = parameter['x-name-pattern']
          }
          parameter.isQueryParameter = true
        } else if (parameter.paramType === 'header') {
          parameter.isHeaderParameter = true
        } else if (parameter.paramType === 'form') {
          parameter.isFormParameter = true
        }
      })
      data.methods.push(method);
      data.specs.push(method);
    })
  })
  return data
}

let parse = function (opts) {
  let data = opts.swagger.swagger === '2.0' ? getViewForSwagger2(opts) : getViewForSwagger1(opts)
  return data
}

module.exports = parse
