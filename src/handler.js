const _ = require('lodash')
const { HttpStatusError } = require('./errors')
const { parse } = require('./parser')
const { raw } = require('./transforms')

class ModelHandler {
  constructor(model, defaults = { limit: 50, offset: 0 }) {
    this.model = model
    this.defaults = defaults
  }

  create() {
    const handle = (req, res, next) => {
      this.model.create(req.body).then(respond).catch(next)

      function respond(row) {
        res.status(201)
        res.send(res.transform(row))
      }
    }

    return [raw, handle]
  }

  get() {
    const handle = (req, res, next) => {
      this._findOne(req.params, req.options).then(respond).catch(next)

      function respond(row) {
        if (!row) {
          throw new HttpStatusError(404, 'Not Found')
        }

        res.send(res.transform(row))
      }
    }

    return [raw, handle]
  }

  query() {
    const handle = (req, res, next) => {
      this._findAndCountAll(req.query, req.options).then(respond).catch(next)

      function respond({ rows, start, end, count }) {
        res.set('Content-Range', `${start}-${end}/${count}`)

        if (count > end) {
          res.status(206)
        } else {
          res.status(200)
        }

        res.send({ rows: res.transform(rows), total: count })
      }
    }

    return [raw, handle]
  }

  remove() {
    const handle = (req, res, next) => {
      const model = this.model
      const options = _.merge(parse(req.params, model), req.options)
      model.findOne(options).then(destroy).then(respond).catch(next)

      function destroy(row) {
        if (!row) {
          throw new HttpStatusError(404, 'Not Found')
        }
        return model.destroy(options)
      }

      function respond() {
        res.sendStatus(204)
      }
    }

    return [handle]
  }

  update() {
    const handle = (req, res, next) => {
      const model = this.model
      const options = _.merge(parse(req.params, model), req.options)
      model.update(req.body, options).then(find).then(respond).catch(next)

      function find() {
        return model.findOne(options)
      }

      function respond(row) {
        res.send(res.transform(row))
      }
    }

    return [raw, handle]
  }

  /**
   * @private
   * @param {Object} params req.params
   * @param {Object} options req.options
   * @returns {Object} database record
   */
  _findOne(params, options) {
    options = _.merge(parse(params, this.model), options)

    return this.model.findOne(options)
  }

  /**
   * @private
   * @param {Object} params req.params
   * @param {Object} options req.options
   * @returns {Object} database records and total
   */
  _findAndCountAll(params, options) {
    let parsed = parse(params, this.model)

    options = _(parsed).defaults(this.defaults).merge(options).value()

    return this.model.findAndCountAll(options).then(extract)

    function extract({ count, rows }) {
      const start = options.offset
      const end = Math.min(count, options.offset + options.limit)

      return { rows, start, end, count }
    }
  }
}

module.exports = ModelHandler
