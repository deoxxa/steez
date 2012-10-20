#!/usr/bin/env node

var fs = require("fs"),
    util = require("util");

var Steez = require("./index");

function Source() {
  Steez.call(this);
}
util.inherits(Source, Steez);

function DelayTarget(delay, concurrency) {
  Steez.call(this);
  this.delay = delay || 100;
  this.concurrency = concurrency || 5;
  this.jobs = 0;
}
util.inherits(DelayTarget, Steez);

DelayTarget.prototype.can_destroy = function can_destroy() {
  return this.jobs === 0;
};

DelayTarget.prototype.write = function write(data) {
  this.jobs++;

  setTimeout(function() {
    this.jobs--;

    this.emit("data", data);

    if (this.jobs <= 0) {
      this.resume();
    }
  }.bind(this), this.delay);

  if (this.jobs >= this.concurrency) {
    this.pause();
  }

  return !this.paused && this.writable;
};

function Printer(tag) {
  Steez.call(this);

  this.tag = tag;
}
util.inherits(Printer, Steez);

Printer.prototype.write = function write(data) {
  console.log(this.tag, data);
};

var source = new Source(),
    target_a = new DelayTarget(100, 5),
    target_b = new DelayTarget(150, 5),
    printer_a = new Printer("a"),
    printer_b = new Printer("b");

source.pipe(target_a).pipe(printer_a);
source.pipe(target_b).pipe(printer_b);

for (var i=0;i<25;++i) {
  source.write(i);
}
