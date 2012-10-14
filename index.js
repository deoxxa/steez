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

  this.on("drain", this.flush_queue.bind(this));
}

util.inherits(Steez, stream.Stream);

// hijacking emit() to re-route "data" events
Steez.prototype._emit = Steez.prototype.emit;
Steez.prototype.emit = function emit() {
  if (arguments[0] === "data") {
    if (this.closed || this.closing) {
      return this;
    }

    if (this.paused) {
      this.queue.push(arguments[1]);
      return this;
    }
  }

  return this._emit.apply(this, arguments);
};

Steez.prototype.write = function write(data) {
  this.emit("data", data);

  return this.writable;
};

Steez.prototype.end = function end(data) {
  if (data) {
    this.write(data);
  }

  this.writable = false;
  this.closing = true;

  this.destroySoon();
};

Steez.prototype.destroySoon = function destroySoon() {
  if (this.queue.length === 0) {
    this.destroy();
  } else {
    this.once("drain", this.destroy.bind(this));
  }
};

Steez.prototype.destroy = function destroy() {
  this.closing = false;
  this.closed = true;
  this.readable = false;
  this.writable = false;

  this.emit("close");
};

Steez.prototype.pause = function pause() {
  this.writable = false;
  this.paused = true;
};

Steez.prototype.resume = function resume() {
  if (!this.closed && !this.closing && this.paused) {
    this.paused = false;
    this.emit("drain");
    this.writable = true;
  }
};

Steez.prototype.flush_queue = function flush_queue() {
  while (this.queue.length && !this.paused) {
    this._emit("data", this.queue.shift());
  }
};
