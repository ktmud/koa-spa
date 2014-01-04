var fs = require('fs');
var path_ = require('path');
var staticCache = require('koa-static-cache');

function isDebug() {
  return !process.env.NODE_ENV || process.env.NODE_ENV == 'development';
}

function defaults(a, b) {
  for (var k in b) {
    if (!a.hasOwnProperty(k)) {
      a[k] = b[k];
    }
  }
}

function transformRoutes(routes) {
  var k, v;
  for (k in routes) {
    v = routes[k];
    if (typeof v === 'string') {
      routes[k] = new RegExp('^' + v.replace(/\:[^\/]+/g, '([^\/]+)') + '$');
    }
  }
  return routes;
}

function cleanFileSizes(files) {
  for (var f in files) {
    delete files[f].length;
    delete files[f].etag;
  }
}

var ONE_DAY = 24 * 60 * 60;
var DEFAULTS = {
  routeBase: '/',
  stripSlash: false,
  index: '/index.html',
  static: {
    maxAge: 60 * ONE_DAY
  }
};

module.exports = function(directory, options) {
  options = options || {};

  defaults(options, DEFAULTS);

  var debug = 'debug' in options ? options.debug : isDebug();

  if (debug && !options.static.cacheControl) {
    options.static.cacheControl = 'no-cache';
  }

  var routes = options.routes;
  var files = {};
  var serve = staticCache(directory, options.static, files);
  var index = options.index;
  var routeBase = options.routeBase.replace(/\/$/, '');
  var stripSlash = options.stripSlash;

  // Clean file size of static-cache when debug
  if (debug) {
    cleanFileSizes(files);
  }

  if (index[0] !== '/') index = '/' + index;
  if (routes) {
    transformRoutes(options.routes);
  }
  if (routeBase) {
    routeBase = new RegExp('^' + routeBase);
  }


  function getHeaders(filekey) {
    var filename = path_.join(directory, filekey);
    if (fs.existsSync(filename)) {
      var stats = fs.statSync(filename);
      return {
        cacheControl: 'no-cache',
        mtime: stats.mtime.toUTCString()
      }
    }
  }

  return function* (next) {
    if (this.method != 'GET' &&
        this.method != 'HEAD' &&
        this.method != 'OPTIONS') {
      this.set('Allow', 'GET,HEAD,OPTIONS');
      this.throw('Method Not Allowed', 405);
    }

    var path, key, file;

    path = this.path;

    // when tail is slash
    if (path.length > 2 && path.slice(-1) === '/') {
      // consider as no slash internally
      path = path.slice(0, -1);
      // if neeed strip slash, do redirect
      if (stripSlash) {
        this.status = 301;
        this.redirect(path);
        return;
      }
    }

    key = routeBase ? path.replace(routeBase, '') : path;
    if (key) {
      if (!files[key] && debug) {
        // if not cached, but debugging,
        // try figure out whether this file exists now
        files[key] = getHeaders(key);
      }
      if (files[key]) {
        return yield serve;
      }
    }

    var matched = false;

    if (!routes) {
      matched = true;
    } else {
      for (var r in routes) {
        // serve index.html for any path under routes
        if (key.match(routes[r])) {
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      this.status = 404;
    }
    // run other middlewares
    yield next;

    if (matched) {
      this.path = index;
      yield serve;
    }
  }
};

module.exports.routeCollector = function(routes) {
  routes = routes || {};
  var ret = function(route, handler) {
    if (route[0] != '/') {
      route = '/' + route; // add head slash
    }
    routes[route] = route.replace(/[^^]\/$/, ''); // clean tail slash
  };
  ret.routes = routes;
  return ret;
};
