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
    routes[k] = new RegExp('^' + v.replace(/\:[^\/]+/g, '([^\/]+)') + '$');
  }
  return routes;
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
  var routeBase = new RegExp('^' + options.routeBase.replace(/\/$/, ''));
  var stripSlash = options.stripSlash;

  if (index[0] !== '/') index = '/' + index;
  if (routes) {
    transformRoutes(options.routes);
  }

  return function* (next) {
    if (this.method != 'GET' &&
        this.method != 'HEAD' &&
        this.method != 'OPTIONS') {
      this.set('Allow', 'GET,HEAD,OPTIONS');
      this.throw('Method Not Allowed', 405);
    }

    var path = this.path;

    // then tail is slash
    if (path.slice(-1) === '/') {
      path = path.slice(0, -1);
      // then strip slash, do redirect
      if (stripSlash) {
        this.status = 301;
        this.redirect(path);
        return;
      }
      // otherwise the url is considered as no slash
    }

    var key = path.replace(routeBase, '');
    if (key) {
      file = files[key];
      if (file) {
        // if static file is found, send the file
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

    // status is still 404, means not served by other middlewares
    if (matched && this.status == 404) {
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