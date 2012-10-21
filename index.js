var stream = require("stream"),
    util = require("util");

var Steez = module.exports = function Steez() {
  stream.Stream.call(this);

  this.writable = true;
  this.readable = true;

  this.pindex = 1;
  this.paused = 0;
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

  return !this.paused && this.writable;
};

Steez.prototype.pause = function pause() {
  return this._pause(1);
};

Steez.prototype._pause = function _pause(pindex) {
  this.paused |= pindex;

  return this;
};

Steez.prototype.resume = function resume() {
  return this._resume(1);
};

Steez.prototype._resume = function _resume(pindex) {
  if (this.paused & pindex) {
    this.paused ^= pindex;
  }

  if (this.closed) {
    return this;
  }

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
    return this.destroy();
  }

  return this;
};

Steez.prototype.destroy = function() {
  this.writable = false;
  this.readable = false;
  this.closed = true;

  this.queue.splice(0);

  this._emit("end");
  this._emit("close");

  return this;
};

Steez.prototype._pipe = Steez.prototype.pipe;
Steez.prototype.pipe = function(target) {
  var pindex = Math.pow(2, this.pindex++),
      shim = {};

  shim.__defineGetter__('readable', function () { return this.readable }.bind(this));
  shim.__defineGetter__('writable', function () { return this.readable }.bind(this));

  shim.removeListener = this.removeListener.bind(this);
  shim.on = this.on.bind(this);

  shim.pause = function() {
    return this._pause(pindex);
  }.bind(this);

  shim.resume = function() {
    return this._resume(pindex);
  }.bind(this);

  return this._pipe.apply(shim, arguments);
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
