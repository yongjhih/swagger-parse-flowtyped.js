const Handlebars = require('handlebars')
const fs = require('fs')
const path = require('path')
const beautify = require('js-beautify').js_beautify
const apiTemplate = fs.readFileSync(path.join(__dirname, './template/api.hbs'), 'utf-8')
Handlebars.registerPartial('types', fs.readFileSync(path.join(__dirname, './template/types.hbs'), 'utf-8'))
Handlebars.registerPartial('type', fs.readFileSync(path.join(__dirname, './template/type.hbs'), 'utf-8'))
Handlebars.registerPartial('methods', fs.readFileSync(path.join(__dirname, './template/methods.hbs'), 'utf-8'))
Handlebars.registerPartial('method', fs.readFileSync(path.join(__dirname, './template/method.hbs'), 'utf-8'))
Handlebars.registerHelper('joinComma', (items, options) => items.map(item => options.fn(item)).map(item => item.trim()).filter(item => item).join(", "));
Handlebars.registerHelper('toLowerCase', function (word) {
  if (!word) return word;
  return word.toLowerCase();
})
Handlebars.registerHelper('brackets', function (word) {
  return `{${word}}`
})
module.exports = function (data) {
  let template = Handlebars.compile(apiTemplate)(data)
  //template = beautify(template, {indent_size: 2, max_preserve_newlines: -1})
  return template
}
