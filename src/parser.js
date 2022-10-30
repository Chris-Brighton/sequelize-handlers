const _ = require('lodash')

module.exports = {
  parse,
  parseString,
  parseInteger,
  parseJson,
  parseSort,
}

function parse(params, { rawAttributes }) {
  const options = {
    where: {},
  }

  const keywords = ['$fields', '$limit', '$offset', '$sort']

  const { $fields, $limit, $offset, $sort } = params

  if ($fields) options.attributes = parseString(params.$fields)
  if ($limit) options.limit = parseInteger(params.$limit)
  if ($offset) options.offset = parseInteger(params.$offset)
  if ($sort) options.order = parseSort(params.$sort)

  _(params)
    .omit(keywords)
    .forOwn((value, key) => {
      if (rawAttributes.hasOwnProperty(key)) {
        options.where[key] = parseJson(value)
      }
    })

  return options
}

function parseString(value) {
  if (value) {
    value = value.split(',')
  }

  return value
}

function parseJson(value) {
  try {
    value = JSON.parse(value)
  } catch (error) {
    value = parseString(value)
  }

  return value
}

function parseInteger(value) {
  value = parseInt(value)

  if (_.isNaN(value)) {
    value = undefined
  }

  return value
}

function parseSort(value) {
  let sort = []
  if (value) {
    const jSort = parseJson(value)
    console.log('json sort', jSort)
    Object.keys(jSort).forEach((key) => {
      if (jSort[key] === -1) sort.push([key, 'DESC'])
      else sort.push([key, 'ASC'])
    })
  }
  console.log('finished sort', sort)
  return sort
}
