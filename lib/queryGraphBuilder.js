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

/**
 * Performs DFS starting in node n. "Processes" all paths starting in node n and
 * ending in one of the destination nodes.
 * The structures _markers and _markersTemp (stored in the current object, 'this')
 * are used internally and should be initialized to {}.
 * @param graph The graph to perform a DFS on.
 * @param cluster The identifier of the cluster containing stop n.
 * @param n start node for DFS
 * @param crossClusters if false, paths crossing cluster boundaries will not be processed
 * @param destinationNodes end nodes of the dfs search (do not continue DFS past one of these nodes)
 * @param stack should be an empty array
 * @param processPath when a valid path has been found, processPath will be called with that path as a parameter
 * @returns true iff one of the destination nodes is reachable starting from n
 */
QueryGraphBuilder.prototype._visit = function (graph, cluster, n, crossClusters,
                                               destinationNodes, stack,
                                               processPath) {
  // TODO: use a stack instead of explicit recursion to improve efficiency

  // We may not prune paths based on the value of this._markers, which means a lot of redundant work is done
  // TODO: reduce redundant work!

  // this._markers indicates reachability of one of the destination nodes starting
  // from the corresponding node
  // this._markersTemp indicates which nodes are on the current path (used for
  // cycle detection.)

  // We keep track wether we can reach one of the destination nodes.
  var destReachable = false;

  stack.push(n);

  // If there is a cycle: do not write a path to the output, since it will be cyclic by definition.
  // Since we don't have a valid path, we cannot reach the destination node.
  if (this._markersTemp[n]) {
    stack.pop();
    return destReachable;
  }
  // Otherwise, we have two possible cases:
  // Case 1: destination node not reachable from n or reachability undecided
  //   => if n is one of the destination nodes, then we have found a valid path
  // Case 2: destination node certainly reachable from n
  //   => one of the paths from n to the destination appended to the current path will form a valid path
  if ((!this._markersTemp[n] && !this._markers[n] && destinationNodes.indexOf(n) > -1) ||
      (!this._markersTemp[n] && this._markers[n])) {
    destReachable = true;
    processPath(stack);
  }

  this._markersTemp[n] = true;

  // Visit every neighbour of n, keeping the value of the crossClusters parameter in mind.
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
}

// Find all paths between 'startNode' and 'endNodes'. Write out every valid path.
QueryGraphBuilder.prototype._localDFS = function (startNode, endNodes, crossClusters) {
  this._markers = {};
  this._markersTemp = {};
  var graph;
  if (this._inverseClustering[startNode] == this._inverseClustering[this._s]) {
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
  // s and t in the same cluster and cluster is convex => use a "simple" DFS.
  if (this._inverseClustering[this._s] == this._inverseClustering[this._t] &&
      this._convexity[this._inverseClustering[this._s]]) {
        console.log('LOCAL');
        this._localDFS(this._t, [this._s], false);
  } else {
    this._borderPaths = {};
    this._borders = [];
    var self = this;

    // First, we calculate every path in the cluster of s,
    // starting in a border node of the cluster of t and ending in s.
    // We store every path in borderPaths and every reachable border node of t's
    // cluster is put in borders.

    // Note that we may "reuse" the markers of a previous DFS run: we should
    // not revisit previously visited nodes since they will never lead to a
    // new path.
    this._markers = {};

    for (var stop in this._sGraph) {
      this._markers = {};
      this._markersTemp = {};
      if (this._inverseClustering[stop] == this._inverseClustering[this._t] &&
          this._borderStations[stop]) {
        // TODO: exploit convexity: once we enter the cluster of s, we should never leave it again
        this._visit(this._sGraph, this._inverseClustering[this._s], stop,
                    true, [this._s], [],
                    function (path) {
                      // TODO why is copy necessary?
                      var pcopy = [];
                      for (var i in path) pcopy.push(path[i]);

                      if (self._borderPaths[stop] == undefined) {
                        self._borderPaths[stop] = [pcopy];
                        self._borders.push(stop);
                      } else {
                        self._borderPaths[stop].push(pcopy);
                      }
                    });
      }
    }

    this._markers = {};
    this._markersTemp = {};
    // We now perform a DFS in the cluster of t, searching for all paths from
    // t to a border node of the cluster. If we find such a path, we also write
    // out all paths in the cluster of s from this border node to s.
    this._visit(this._tGraph, this._inverseClustering[this._t], this._t,
                !this._convexity[this._inverseClustering[this._t]],
                self._borders, [],
                function (path) {
                  for (var idx in self._borderPaths[path[path.length - 1]]) {
                    self.push(self._borderPaths[path[path.length - 1]][idx]);
                  }
                  self._borderPaths[path[0]] = [];
                  self.push(path);
                });

  }

  callback();
};

module.exports = QueryGraphBuilder;
