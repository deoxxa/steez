var buster       = require('buster')
  , concatStream = require('concat-stream')
  , fs           = require('fs')
  , util         = require('util')

  , assert       = buster.assert
  , Steez        = require('../')

function ChunkReverser() {
  Steez.call(this)
}

util.inherits(ChunkReverser, Steez)

ChunkReverser.prototype.write = function write(data) {
  this.emit('data', Buffer(data.toString().split('').reverse().join('')))

  return !this.paused && this.writable
}

// uses `fs.createReadStream()` as a reference Stream implementation

buster.testCase('ChunkReverser', {
    'setUp': function (done) {
      this.bogan = "She'll be right pozzy no worries stands out like a dunny. Lets get some blowie also rotten. spag bol as cunning as a ugg boots. Trent from punchy vinnie's piece of piss lets get some metho. Come a dunny where you little ripper piker. You little ripper galah no dramas he hasn't got a true blue."
      this.file = '$$_chunkReverserTest_$$'
      fs.writeFile(this.file, this.bogan, done)
    }

  , 'tearDown': function (done) {
      fs.unlink(this.file, done)
    }

  , 'test basic ChunkReverser': function (done) {
      var collector = concatStream(function(err, data) {})
        , inStream = fs.createReadStream(this.file)
        , expected = this.bogan.split('').reverse().join('')

        , verify = function () {
            assert.equals(collector.getBody().toString(), expected)
            done()
          }.bind(this)

      inStream.pipe(new ChunkReverser()).pipe(collector)
      inStream.on('end', verify)
    }
})