var stream = require('stream'),
    util = require('util');

var QueryGraphBuilder = function (s, t, sGraph, tGraph, inverseClustering,
                                  convexity, borderStations) {
  stream.Transform.call(this, {objectMode : true});

  this._s = s;
  this._t = t;
  this._sGraph = sGraph;
  this._tGraph = tGraph;
  this._inverseClustering = inverseClustering;
  this._convexity = convexity;
  this._borderStations = borderStations;

  this._markers = {};
  this._markersTemp = {};
};

// TODO: Readable stream?
util.inherits(QueryGraphBuilder, stream.Transform);

QueryGraphBuilder.prototype._write = function (data, encoding, done) {
  done();
};

QueryGraphBuilder.prototype._visit = function (graph, cluster, n, crossClusters,
                                               destinationNodes, stack,
                                               processPath) {
  var destReachable = false;

  stack.push(n);

  // If there is a cycle: do not write a path to the output, since it will be cyclic by definition.
  // Otherwise, we have two possible cases:
  // Case 1: node n has not yet been fully processed or the destination node was not yet reachable
  //   => if n is one of the destination nodes, then we have found a valid path
  // Case 2: node n has already been fully processed and marked with 'true'
  //   => one of the paths from n to the destination appended to the current path will form a valid path
  if ((!this._markersTemp[n] && !this._markers[n] && destinationNodes.indexOf(n) > -1) ||
      (!this._markersTemp[n] && this._markers[n])) {
    destReachable = true;
    processPath(stack);
  }

  // detect cycles
  if (this._markersTemp[n]) {
    stack.pop();
    return destReachable;
  }

  if (this._markers[n] == undefined) {
    this._markersTemp[n] = true;

    for (var mIdx in graph[n]) {
      var m = graph[n][mIdx];
      if (crossClusters || this._inverseClustering[m] == cluster) {
        if (this._visit(graph, cluster, m, crossClusters, destinationNodes, stack, processPath)) {
          destReachable = true;
        }
      }
    }

    this._markers[n] = destReachable;
    this._markersTemp[n] = false;

    stack.pop();
    return destReachable;
  } else {
    stack.pop();
    return this._markers[n];
  }
}

QueryGraphBuilder.prototype._localDFS = function (startNode, endNodes, crossClusters) {
  this._markers = {};
  this._markersTemp = {};
  var graph;
  if (this._inverseClustering[startNode] == this._inverseClustering(this._s)) {
    graph = this._sGraph;
  } else {
    graph = this._tGraph;
  }
  var self = this;
  this._visit(graph, this._inverseClustering[startNode], startNode, crossClusters,
              endNodes, [], function (path) {
                self.push(path);
              });
}

QueryGraphBuilder.prototype._flush = function (callback) {
  if (this._inverseClustering[this._s] == this._inverseClustering[this._t] &&
      this._convexity[this._inverseClustering[this._s]]) {
        this._localDFS(this._t, [this._s], false);
  } else {
    var borderPaths = {};
    var borders = [];
    var self = this;
    for (var stop in this._sGraph) {
      this._markers = {};
      this._markersTemp = {};
      if (this._inverseClustering[stop] == this._inverseClustering[this._t] &&
          this._borderStations[stop]) {
        // TODO: exploit convexity: once we enter the cluster of s, we should never leave it again
        // TODO: exploit properties of a valid transfer pattern to prune paths
        this._visit(this._sGraph, this._inverseClustering[this._s], stop,
                    true, [this._s], [],
                    function (path) {
                      self.push(path);
                      if (borderPaths[stop] == undefined) {
                        borderPaths[stop] = [path];
                        borders.push(stop);
                      } else {
                        borderPaths[stop].push(path);
                      }
                    });
      }
    }

    this._markers = {};
    this._markersTemp = {};
    this._visit(this._tGraph, this._inverseClustering[this._t], this._t,
                this._convexity[this._inverseClustering[this._t]],
                borders, [],
                function (path) {
                  self.push(path);
                });
  }

  callback();
};

module.exports = QueryGraphBuilder;
