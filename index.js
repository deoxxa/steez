var stream = require("stream"),
    util = require("util");

var Steez = module.exports = function Steez() {
  stream.Stream.call(this);

  this.writable = true;
  this.readable = true;

  this.paused = false;
  this.closing = false;
  this.closed = false;

  this.queue = [];
};
util.inherits(Steez, stream.Stream);

Steez.prototype._emit = Steez.prototype.emit;
Steez.prototype.emit = function emit() {
  if (arguments[0] === "data") {
    this.queue.push(arguments[1]);
    this.flush();
    return this;
  }

  return this._emit.apply(this, arguments);
};

Steez.prototype.write = function write(data) {
  this.emit("data", data);

  return this.writable;
};

Steez.prototype.pause = function pause() {
  this.paused = true;

  return this;
};

Steez.prototype.resume = function resume() {
//  try { throw new Error(); } catch (e) { console.log(e.stack); }

  if (this.closed) {
    return this;
  }

  this.paused = false;

  return this.flush();
};

Steez.prototype.flush = function flush() {
  if (this.closed) {
    return this;
  }

  while (this.queue.length && !this.paused) {
    this._emit("data", this.queue.shift());
  }

  if (this.queue.length === 0) {
    if (this.closing) {
      process.nextTick(this.destroySoon.bind(this));
    } else {
      this._emit("drain");
    }
  }

  return this;
};

Steez.prototype.end = function end(data) {
//  try { throw new Error(); } catch (e) { console.log(e.stack); }

  if (data) {
    this.write(data);
  }

  this.writable = false;
  this.closing = true;

  return this.flush();
};

Steez.prototype.destroySoon = function destroySoon() {
  this.writable = false;
  this.closing = true;

  if (this.queue.length) {
    this.flush();
  }

  if (this.queue.length || (typeof this.can_destroy === "function" && !this.can_destroy())) {
    return this.once("drain", this.destroySoon.bind(this));
  }

  if (!this.closed) {
    this.destroy();
  }
};

Steez.prototype.destroy = function() {
  this.writable = false;
  this.readable = false;
  this.closed = true;

  this.queue.splice(0);

  this._emit("end");
  this._emit("close");
};

/*
(function tracify(p) {
  for (var k in p) {
    if (!Object.hasOwnProperty.apply(p, [k])) {
      continue;
    }

    (function(k) {
      var fn = p[k];
      p[k] = function() {
        console.log(this.constructor.name, p.constructor.name, k, Array.prototype.slice.apply(arguments));
        return fn.apply(this, arguments);
      };
    }(k));
  }
}(Steez.prototype));
*/
