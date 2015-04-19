var chokidar = require('chokidar');
var p = require('path');
var FileSystemObject = require('../../shared/file-system-object');

var path = require('path');
var root = process.cwd();
if (process.argv[2])
  root = path.resolve(process.argv[2]);

var watcher = chokidar.watch(root, {
  ignored: function(path, stat) {
    // This function gets called twice per path.
    // Once with a single argument (the path),
    // second time with two arguments (the path and the fs.Stats object of that path).
    return stat && stat.isDirectory() ? /\/node_modules|[\/\\]\./.test(path) : false;
  },
  ignoreInitial: true
});

var filter = require('./filter.js');

module.exports = {
  watcher: watcher,
  get watched() {

    var items = {};
    var watched = watcher.watched;

    for (var dirpath in watched) {
      // add directory
      items[dirpath] = new FileSystemObject(dirpath, true);

      for (var i = 0; i < watched[dirpath].length; i++) {
        var name = watched[dirpath][i];
        var path = p.join(dirpath, name);
        if (!watched[path]) {
          // add file
          if(filter.isRetain(name))
            items[path] = new FileSystemObject(path, false);
        }
      }
    }

    return items;

  }
};