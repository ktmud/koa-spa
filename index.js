var crypto = require('crypto')
var fs = require('fs')
var path_ = require('path')
var mime = require('mime')
var pathToRegexp = require('path-to-regexp')
var staticCache = require('koa-static-cache')

var ONE_DAY = 24 * 60 * 60
var DEFAULTS = {
  routeBase: '/',
  stripSlash: false,
  index: '/index.html',
  static: {
    maxAge: 60 * ONE_DAY
  }
}

function isDebug() {
  return !process.env.NODE_ENV || process.env.NODE_ENV == 'development'
}

function defaults(a, b) {
  for (var k in b) {
    if (!a.hasOwnProperty(k)) {
      a[k] = b[k]
    }
  }
}

function transformRoutes(routes) {
  var k, v
  for (k in routes) {
    v = routes[k]
    if (typeof v === 'string') {
      routes[k] = new RegExp('^' + v.replace(/\:[^\/]+/g, '([^\/]+)') + '$')
    }
  }
  return routes
}

function cleanFileSizes(files) {
  for (var f in files) {
    delete files[f].length
    delete files[f].etag
  }
}

module.exports = function(directory, options) {
  options = options || {}

  defaults(options, DEFAULTS)

  var debug = 'debug' in options ? options.debug : isDebug()

  if (debug && !options.static.cacheControl) {
    options.static.cacheControl = 'no-cache'
  }

  var routes = options.routes
  var files = {}
  var serve = staticCache(directory, options.static, files)
  var alias = options.static.alias || {}
  var index = options.index
  var routeBase = options.routeBase.replace(/\/$/, '')
  var stripSlash = options.stripSlash

  if (index[0] !== '/') index = '/' + index
  if (routes) {
    transformRoutes(options.routes)
  }
  if (routeBase) {
    routeBase = new RegExp('^' + routeBase)
  }


  function getHeaders(filekey) {
    filekey = alias[filekey] || filekey
    var filename = path_.join(directory, filekey)
    if (fs.existsSync(filename)) {
      var obj = {}
      var stats = fs.statSync(filename)
      var buffer = fs.readFileSync(filename)

      obj.path = filename;
      obj.cacheControl = options.static.cacheControl
      obj.maxAge = options.static.maxAge || 0
      obj.mtime = stats.mtime.toUTCString()
      obj.type = obj.mime = mime.lookup(filekey)
      obj.length = stats.size
      obj.md5 = crypto.createHash('md5').update(buffer).digest('base64')
      return obj
    }
  }

  return function* (next) {
    if (this.method != 'GET' &&
        this.method != 'HEAD' &&
        this.method != 'OPTIONS') {
      this.set('Allow', 'GET,HEAD,OPTIONS')
      this.throw('Method Not Allowed', 405)
    }

    var path, key, file

    path = this.path

    // when tail is slash
    if (path.length > 2 && path.slice(-1) === '/') {
      // consider as no slash internally
      path = path.slice(0, -1)
      // if neeed strip slash, do redirect
      if (stripSlash) {
        this.status = 301
        this.redirect(path)
        return
      }
    }

    key = routeBase ? path.replace(routeBase, '') : path
    if (key === '/') {
      key = index;
      this.path = index;
    }
    if (key) {
      if (debug) {
        // if debugging, always update file headers
        files[key] = getHeaders(key)
      }
      if (files[key]) {
        return yield serve
      }
    }

    var matched = false

    if (!routes) {
      matched = true
    } else {
      for (var r in routes) {
        // serve index.html for any path under routes
        if (routes[r].test(key)) {
          matched = true
          break
        }
      }
    }

    if (!matched) {
      this.status = 404
    }
    // run other middlewares
    yield next

    if (matched) {
      this.path = index
      yield serve
    }
  }
}

module.exports.routeCollector = function(routes) {
  routes = routes || {}
  var ret = function(route, handler) {
    if (route[0] != '/') {
      route = '/' + route // add head slash
    }
    routes[route] = pathToRegexp(route) // clean tail slash
  }
  ret.routes = routes
  return ret
}
