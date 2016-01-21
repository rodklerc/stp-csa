#!/usr/bin/node

var QueryGraphBuilder = require('../lib/queryGraphBuilder.js');

var s = 'x1', t = 'y3';
//var s = 'x1', t = 'x2';

var sGraph = {};
sGraph['x1'] = ['x2', 'x3'];
sGraph['x2'] = ['x1', 'x3', 'b3'];
sGraph['x3'] = ['x1', 'x2'];
sGraph['b1'] = ['b3', 'B3'];
sGraph['b2'] = ['b1', 'b3', 'B2'];
sGraph['b3'] = ['x2', 'b2', 'B1'];
sGraph['B1'] = ['b3'];
sGraph['B2'] = ['b2'];
sGraph['B3'] = ['b1'];

var tGraph = {};
tGraph['y1'] = ['B1', 'B2'];
tGraph['y2'] = ['y1'];
tGraph['y3'] = ['y1', 'y2'];
tGraph['B1'] = ['b3', 'y1'];
tGraph['B2'] = ['b2', 'y1'];
tGraph['B3'] = ['b1'];
tGraph['b1'] = ['B3'];
tGraph['b2'] = ['B2'];
tGraph['b3'] = ['B1'];

var inverseClustering = {};
inverseClustering['x1'] = '1';
inverseClustering['x2'] = '1';
inverseClustering['x3'] = '1';
inverseClustering['b1'] = '1';
inverseClustering['b2'] = '1';
inverseClustering['b3'] = '1';
inverseClustering['y1'] = '2';
inverseClustering['y2'] = '2';
inverseClustering['y3'] = '2';
inverseClustering['B1'] = '2';
inverseClustering['B2'] = '2';
inverseClustering['B3'] = '2';

var convexity = {};
convexity['1'] = true;
convexity['2'] = true;

var borderStations = {};
borderStations['x1'] = false;
borderStations['x2'] = false;
borderStations['x3'] = false;
borderStations['b1'] = true;
borderStations['b2'] = true;
borderStations['b3'] = true;
borderStations['y1'] = false;
borderStations['y2'] = false;
borderStations['y3'] = false;
borderStations['B1'] = true;
borderStations['B2'] = true;
borderStations['B3'] = true;

var qgb = new QueryGraphBuilder(s, t, sGraph, tGraph, inverseClustering, convexity, borderStations);
qgb.on('data', function (path) {
  console.log(path);
});
qgb.end();
