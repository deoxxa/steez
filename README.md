Steez
=====

The g of a mack and the steez of a geezer.

Overview
--------

Steez helps you create well behaved streams in a very unobtrusive manner. It
does this by hijacking your outgoing `data` events, implementing buffering,
providing accurate `pause()`/`resume()` behaviour and trying really hard to play
nicely with all manners of `pipe()` usage.

Rationale
---------

Implementing `pause()`/`resume()`/`end()`/etc semantics every time you write
some code that you want to use as a stream is annoying. Steez tries to make this
a thing of the past by providing an extendable base class with some transparent
magic built in to make your stream behave nicely.

Features
--------

* Transparent `data` event queueing (by hijacking `emit()`)
* Accurate `pause()`, `resume()`, `end()`, `destroySoon()` and `destroy()`
  implementations out of the box
* Multi-target stream synchronisation (more on this [below](#multi-target-pipe))

Multi-Target `pipe()`
---------------------

With a regular [stream](http://nodejs.org/docs/latest/api/all.html#all_stream),
if you pipe to more than one target and more than one of those targets initiates
or relays `pause()` or `resume()` calls, you can end up with some very strange
behaviour.

Take this code for example:

```javascript
var fs = require("fs"),
    util = require("util");

var src = fs.createReadStream("/mnt/my_ssd/src"),
    fast_dst = fs.createWriteStream("/mnt/my_ssd/dst"),
    slow_dst = fs.createWriteStream("/mnt/my_floppy_drive/dst");

src.pipe(fast_dst);
src.pipe(slow_dst);
```

In this case, you would logically expect the `src` stream to be limited to the
slower of the two `dst` streams. This, however, is not the case. In reality, the
you will end up with the `src` stream flipping rapidly between paused and
unpaused. This is why:

1. `slow_dst` stream will `pause()` the `src` stream as it will block on writing
    much quicker than `fast_dst`.
2. Before `slow_dst` has become ready for writing again, `fast_dst` will
   `resume()` `src` as its write buffer will have emptied (after `slow_dst`
   called `pause()` on `src`).
3. Upon emitting another chunk of data, `slow_dst` will immediately `pause()`
   `src` again, as it's still not ready for writing.
4. Points 2 and 3 will be repeated for a while, until either `fast_dst` finishes
   or `slow_dst` collapses under the weight of its own internal buffering
   mechanism (hey, it could happen).

To solve this, Steez keeps a record of which `pipe()`ed streams have asked to
`pause()` or `resume()` the Steez instance and only resumes emitting data after
all targets are ready.

Installation
------------

Available via [npm](http://npmjs.org/):

> $ npm install steez

Or via git:

> $ git clone git://github.com/deoxxa/steez.git node_modules/steez

Usage
-----

```javascript
#!/usr/bin/env node

var fs = require("fs"),
    util = require("util");

var Steez = require("steez");

function ChunkReverser() {
  Steez.call(this);
}
util.inherits(ChunkReverser, Steez);

ChunkReverser.prototype.write = function write(data) {
  this.emit("data", Buffer(data.toString().split("").reverse().join("")));

  return !this.paused && this.writable;
};

var chunk_reverser = new ChunkReverser();

var a = fs.createReadStream("./data.in"),
    b = fs.createWriteStream("./data.out");

a.pipe(chunk_reverser).pipe(b);
```

License
-------

3-clause BSD. A copy is included with the source.

Contributors
------------

* [deoxxa](http://github.com/deoxxa)
* [rvagg](http://github.com/rvagg)

Contact
-------

* GitHub ([deoxxa](http://github.com/deoxxa))
* Twitter ([@deoxxa](http://twitter.com/deoxxa))
* ADN ([@deoxxa](https://alpha.app.net/deoxxa))
* Email ([deoxxa@fknsrs.biz](mailto:deoxxa@fknsrs.biz))
