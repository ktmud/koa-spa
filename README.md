# koa-spa

Create a Single Page Application(SPA) server with [koa](http://koajs.com).
Just like what [pushserve](https://github.com/paulmillr/pushserve) does.

The goal is simple, make all routes under your SPA send the same `index.html`,
while keep assets files (css, js) under the same directory accessible.

This is only a koa middleware,
so you can decorate the server with your own middlewares,
or integrate this "pushState friendly" functionality into
a _normal server_ (with server side routing).

A custom 404 page is possible, too.

## Example

```javascript
var path_ = require('path');

var koa = require('koa');
var spa = require('koa-spa');

exports.startServer = function(port, path) {
  var routes = {};

  // collect available routes
  require('./app/routes')(spa.routeCollector(routes));

  var app = koa();
  app.use(spa(path_.join(__dirname, path), {
     index: 'index.html',
     routeBase: '/',
     routes: routes
  }));

  // assets file requests will not run through middlewares below,
  // but `index.html` requests will
  // app.use(detectLanguage());

  // add your custom 404 page
  app.use(function* () {
    // requests not matching the routes will have a status of 404 by now,
    // but the response it not yet sent
    if (this.status == 404) {
      res.body = 'Nothing Here.';
    }
  });

  app.listen(port);
};
```

If your are using something like [brunch](http://brunch.io) and Backbone.js,
the `app/routes.js` required above would be your routes configuration for Backbones.js:

```javascript
module.exports = function(match) {
  match('', 'home#index');
  match('login', 'account#login');
  match('logout', 'account#logout')
};
```


## License

The MIT License (MIT)

Copyright (c) 2013-2014 Jesse Yang (http://ktmud.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

