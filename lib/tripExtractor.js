var stream = require('stream'),
    util = require('util');

var TripExtractor = function (stopToTripMapping) {
  stream.Transform.call(this, {objectMode : true});
  this._paths = {};
  this._trips = {};
  this._stopToTripMapping = stopToTripMapping;
};

util.inherits(TripExtractor, stream.Transform);

TripExtractor.prototype._write = function (path, encoding, done) {
  for (var i = path.length - 1; i >= 1; i--) {
    if (this._paths[path[i]] == undefined) {
      this._paths[path[i]] = [];
    }
    if (this._paths[path[i]].indexOf(path[i-1]) <= -1) {
      var trips = this._stopToTripMapping[path[i]][path[i-1]];
      if (trips == undefined) {
        console.error(path[i] + ',' + path[i-1] + ' not in stop to trip mapping');
      } else {
        for (var tidx in trips) {
          var trip = trips[tidx];
          if (this._trips[trip] == undefined) {
            this._trips[trip] = true;
            this.push(trip);
          }
        }
        this._paths[path[i]].push(path[i-1]);
      }
    }
  }
  done();
};

module.exports = TripExtractor;
