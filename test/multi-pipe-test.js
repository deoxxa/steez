var buster     = require('buster')
  , fs         = require('fs')
  , async      = require('async')
  , SlowStream = require('slow-stream')
  , assert     = buster.assert
  , Boganizer  = require('./boganizer')

  , verifyBoganFile = function (file, callback) {
      fs.readFile(file, function (err, data) {
        refute(err)
        return callback(err)

        assert.equals(data.toString(), Boganizer.boganData)
        callback()
      })
    }

buster.testCase('Multi-pipe test', {
    'setUp': function() {
      this.timeout = 10000
      this.files = []
    }

  , 'tearDown': function (done) {
      async.forEach(this.files, fs.unlink, done)
    }

    // Pipe to a bunch of fs.createWriteStreams simultaneously
  , 'direct fs.createWriteStream': {
        'setUp': function() {
          for (var i = 0; i < 100; i++) this.files.push('$$_boganized_test_' + i + '_$$')
        }

      , 'test multi-file write': function (done) {
          var boganizer = new Boganizer()
              // verify that they all have the correct output
            , verify = function () {
                // delay a little big because we're at the 'end' of boganizer, not the fs streams
                // so they still may be writing
                setTimeout(function () {
                  async.forEach(this.files, verifyBoganFile, done)
                }.bind(this), 50)
              }.bind(this)

          this.files.forEach(function (file) {
            boganizer.pipe(fs.createWriteStream(file))
          })
          boganizer.on('end', verify)
        }
    }

  , 'throttled fs.createWriteStream': {
        'test multi-file throttled write': function (done) {
          var boganizer   = new Boganizer()
            , start       = +new Date
            , dataEvents  = 0
            , endedCount  = 0
            , maxInterval = 120

              // verify that all the files actually have the right output
            , verify = function () {
                async.forEach(this.files, verifyBoganFile, done)
              }.bind(this)

              // for *each* stream, we check that the total duration is within
              // +/- 10ms of what we expect per event for the maxInterval stream
              // i.e., even the 10ms per event stream should take roughly
              // maxInterval per event to execute
            , onEnd      = function (msg) {
                var duration = +new Date - start
                  , perEvent = duration / dataEvents

                msg = msg + ' took ' + perEvent + ' ms'
                assert(perEvent > maxInterval - 10, msg)
                assert(perEvent < maxInterval + 10, msg)

                if (++endedCount == this.files.length)
                  verify()
              }.bind(this)

          // attach the boganizer to various, different speed streams
          // it should take as long as it takes the longest one to finish
          this.files.push('$$_boganized_test_throttled_10_$$')
          boganizer.pipe(new SlowStream({ maxWriteInterval: 10 }))
            .pipe(fs.createWriteStream(this.files[this.files.length - 1]))
            .on('close', onEnd.bind(this, '10 ms throttled stream'))
          this.files.push('$$_boganized_test_throttled_20_$$')
          boganizer.pipe(new SlowStream({ maxWriteInterval: 20 }))
            .pipe(fs.createWriteStream(this.files[this.files.length - 1]))
            .on('close', onEnd.bind(this, '20 ms throttled stream'))
          this.files.push('$$_boganized_test_throttled_max_$$')
          boganizer.pipe(new SlowStream({ maxWriteInterval: maxInterval }))
            .pipe(fs.createWriteStream(this.files[this.files.length - 1]))
            .on('close', onEnd.bind(this, maxInterval + ' ms throttled stream'))
          this.files.push('$$_boganized_test_throttled_40_$$')
          boganizer.pipe(new SlowStream({ maxWriteInterval: 40 }))
            .pipe(fs.createWriteStream(this.files[this.files.length - 1]))
            .on('close', onEnd.bind(this, '40 ms throttled stream'))
          this.files.push('$$_boganized_test_throttled_30_$$')
          boganizer.pipe(new SlowStream({ maxWriteInterval: 30 }))
            .pipe(fs.createWriteStream(this.files[this.files.length - 1]))
            .on('close', onEnd.bind(this, '30 ms throttled stream'))
          boganizer.on('data', function () { dataEvents++ })
        }
    }

})