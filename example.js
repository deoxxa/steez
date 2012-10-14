#!/usr/bin/env node

var fs = require("fs"),
    util = require("util");

var Steez = require("./index");

function ChunkReverser() {
  Steez.call(this);
}
util.inherits(ChunkReverser, Steez);

ChunkReverser.prototype.write = function write(data) {
  this.emit("data", Buffer(data.toString().split("").reverse().join("")));

  return this.writable;
};

var chunkreverser = new ChunkReverser();

var a = fs.createReadStream("./data.in"),
    b = fs.createWriteStream("./data.out");

a.pipe(chunkreverser).pipe(b);
