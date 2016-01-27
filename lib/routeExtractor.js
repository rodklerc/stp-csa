var stream = require('stream'),
    util = require('util');

var RouteExtractor = function (stopToRouteMapping) {
  stream.Transform.call(this, {objectMode : true});
  this._paths = {};
  this._routes = {};
  this._stopToRouteMapping = stopToRouteMapping;
};

util.inherits(RouteExtractor, stream.Transform);

RouteExtractor.prototype._write = function (path, encoding, done) {
  for (var i = path.length - 1; i >= 1; i--) {
    if (this._paths[path[i]] == undefined) {
      this._paths[path[i]] = [];
    }
    if (this._paths[path[i]].indexOf(path[i-1]) <= -1) {
      var routes = this._stopToRouteMapping[path[i]][path[i-1]];
      if (routes == undefined) {
        console.error(path[i] + ',' + path[i-1] + ' not in stop to route mapping');
      } else {
        for (var tidx in routes) {
          var route = routes[tidx];
          if (this._routes[route] == undefined) {
            this._routes[route] = true;
            this.push(route);
          }
        }
        this._paths[path[i]].push(path[i-1]);
      }
    }
  }
  done();
};

module.exports = RouteExtractor;
