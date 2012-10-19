steez
=====

The g of a mack and the steez of a geezer.

Overview
--------

Implementing `pause()`/`resume()` semantics every time you write some code that
you want to use as a stream is annoying. steez tries to make this a thing of the
past by providing a properly extendable base class with some transparent magic
built in to make your stream behave nicely. When you `.emit("data", ...)`, steez
will trap the event and queue it up for later if your stream is paused. It will
also handle all the requisite events and methods for proper `pipe()` usage.

Installation
------------

Available via [npm](http://npmjs.org/):

> $ npm install steez

Or via git:

> $ git clone git://github.com/deoxxa/node-steez.git node_modules/steez

Usage
-----

```javascript
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

Contact
-------

* GitHub ([deoxxa](http://github.com/deoxxa))
* Twitter ([@deoxxa](http://twitter.com/deoxxa))
* ADN ([@deoxxa](https://alpha.app.net/deoxxa))
* Email ([deoxxa@fknsrs.biz](mailto:deoxxa@fknsrs.biz))
