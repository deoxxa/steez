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
}

util.inherits(Steez, stream.Stream);

// hijacking emit() to re-route "data" events
Steez.prototype._emit = Steez.prototype.emit;
Steez.prototype.emit = function emit() {
  console.log("emit", arguments);

  // hijack data events
  if (arguments[0] === "data") {
    // if we're closing or are already closed, we don't want to let any data
    // events through at all.
    if (this.closing || this.closed) {
      return this;
    }

    // this is to facilitate skipping the whole queueing process if possible.
    // we can be marked as not paused but still have data in the queue in some
    // circumstances, so we have to check the queue length.
    if (this.paused || this.queue.length) {
      this.queue.push(arguments[1]);
      return this;
    }
  }

  return this._emit.apply(this, arguments);
};

Steez.prototype.write = function write(data) {
  console.log("write");

  this.emit("data", data);

  return this.writable;
};

Steez.prototype.end = function end(data) {
  console.log("end");

  if (data) {
    this.write(data);
  }

  return this.destroySoon();
};

Steez.prototype.destroySoon = function destroySoon() {
  console.log("destroySoon", this.queue.length);

  // mark as not writable.
  this.writable = false;

  // mark as closing - this stops "data" events from working so we don't
  // accumulate more data in the queue.
  this.closing = true;

  // if we've still got data in the queue, we can't destroy() yet so we schedule
  // another attempt at everything later on.
  if (this.queue.length !== 0) {
    return this.once("drain", this.destroySoon.bind(this));
  }

  // switch from closing to closed - this stops resume() from working
  this.closing = false;
  this.closed = true;

  // we can be sure no more data events are going to be emitted, so it's time to
  // emit "end"
  this.emit("end");

  // close everything down
  return this.destroy();
};

Steez.prototype.destroy = function destroy() {
  console.log("destroy");

  // mark as not readable/writable
  this.readable = false;
  this.writable = false;

  // empty the write queue
  this.queue.splice(0);

  // emit "close" to tell everything listening that we've gone away
  return this.emit("close");
};

Steez.prototype.pause = function pause() {
  console.log("pause");

  // mark as not writable
  this.writable = false;

  // mark as paused - this toggles data queueing and resume() functionality
  this.paused = true;

  return this;
};

Steez.prototype.resume = function resume() {
  console.log("resume");

  // we only want to resume if we're not closed and we're currently paused
  if (!this.closed && this.paused) {
    this.paused = false;

    // inside flush_queue, we emit "drain" when necessary
    this.flush_queue();
  }

  return this;
};

Steez.prototype.flush_queue = function flush_queue() {
  console.log("flush_queue");

  while (this.queue.length && !this.paused) {
    this._emit("data", this.queue.shift());
  }

  // we emit "drain" when we've drained the write buffer *and* we're not in the
  // process of shutting everything down.
  if (this.queue.length === 0 && !this.closing) {
    this.writable = true;
    this._emit("drain");
  }

  return this;
};
