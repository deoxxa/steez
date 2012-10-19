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
  this.writable = false;

  return this;
};

Steez.prototype.resume = function resume() {
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
      this.destroySoon();
    } else if (!this.writable) {
      this.writable = true;
      this.emit("drain");
    }
  }

  return this;
};

Steez.prototype.end = function end(data) {
  if (data) {
    this.write(data);
  }

  this.writable = false;
  this.closing = true;

  return this.flush();
};

Steez.prototype.can_destroy = function can_destroy() {
  return this.queue.length === 0;
};

Steez.prototype.destroySoon = function destroySoon() {
  if (this.queue.length) {
    return this.flush();
  }

  if (this.queue.length) {
    return this.once("drain", this.destroySoon.bind(this));
  }

  if (!this.can_destroy()) {
    process.nextTick(this.destroySoon.bind(this));
    return this;
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

  this.emit("end");
  this.emit("close");
};

// lol super debugging
/*
for (var k in Steez.prototype) {
  if (!Object.hasOwnProperty.apply(Steez.prototype, [k])) {
    continue;
  }

  (function(k) {
    var fn = Steez.prototype[k];
    Steez.prototype[k] = function() {
      console.log(this.constructor.name, k, arguments);
      return fn.apply(this, arguments);
    };
  }(k));
}
*/
