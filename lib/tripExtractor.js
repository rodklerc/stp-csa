var stream = require('stream'),
    util = require('util');

var TripExtractor = function (stopToTripMapping) {
  stream.Transform.call(this, {objectMode : true});
  this._paths = {};
  this._trips = {};
};

util.inherits(TripExtractor, stream.Transform);

TripExtractor.prototype._write = function (path, encoding, done) {
  for (var i = 0; i < path.length - 1) {
    if (this._paths[path[i]] == undefined) {
      this._paths[path[i]] = [];
    }
    if (this._paths[path[i]].indexOf(path[i+1]) <= -1) {
      var trip = stopToTripMapping[path[i]][path[i+1]];
      if (trip == undefined)
        console.error(path[i] + ',' + path[i+1] + ' not in stop to trip mapping');
      if (this._trips[trip] == undefined) {
        this._trips[trip] = true;
        this.push(trip);
      }
      this._paths[path[i]].push(path[i+1]);
    }
  }
  done();
};

module.exports = TripExtractor;
