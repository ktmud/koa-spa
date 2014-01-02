# koa-spa

Create a Single Page Application(SPA) server with [koa](http://koajs.com).

The goal is simple, make all routes under your SPA sending the same `index.html`.

This is only a [koajs](http://koajs.com) middleware,
so you can decorate the server with your own middlewares,
or integrate this `pushState` friendly functionality into
a _normal server_ with existing server side routing.

What's even better, you can provide a 404 page just like normal koajs app.


## Example

```javascript
var path_ = require('path');

var koa = require('koa');
var spa = require('koa-spa');

var LOCALE_COOKIE = 'locale';
var ALL_LOCALES = ['zh-cn', 'zh-tw', 'en'];

var routes = {};

// collect all available routes
require('./app/routes')(spa.routeCollector(routes));

/**
 * Find out what languages user can use, and set a cookie for that
 */
function detectLanguage(availables) {
  return function *() {
    if (!this.cookies.get(LOCALE_COOKIE)) {
      var accept = this.acceptsLanguages(availables);
      if (accept) {
        this.cookies.set(LOCALE_COOKIE, accept, { 
          httpOnly: false,
          signed: false,
          expires: new Date(+new Date() + 3000 * ONE_DAY)
        });
      }
    }
  }
}


exports.startServer = function(port, path) {
  var app = koa();
  app.use(spa(path_.join(__dirname, path), {
     index: 'index.html',
     routeBase: '/',
     routes: routes
  }));

  // static file requests will not run through middlewares below,
  // but `index.html` requests will
  app.use(detectLanguage(ALL_LOCALES));

  // add your custom 404 page
  app.use(function() {
    res.status = 404;
    res.body = 'not found';
  });

  app.listen(port);
};
```

`app/routes.js` is your route configuration file for Backbones.js

```javascript
module.exports = function(match) {
  match '', 'home#index'
  match 'login', 'account#login'
  match 'logout', 'account#logout'
};
```

## Credit

`koa-spa` is inspired by @paulmillr's [pushserve](https://github.com/paulmillr/pushserve).


## License

The MIT License (MIT)

Copyright (c) 2013-2014 Jesse Yang (http://ktmud.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

