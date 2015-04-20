var filesystem = require('../file-system');
var watcher = require('../file-system-watcher');
var sessionManager = require('../session-manager');
var Editor = require('../editor');
var Session = require('../editor/session');
var Range = ace.require("ace/range").Range;

// todo: sort out the session/editor/manager bindings.
// Not sure if sessions are getting destroyed correctly.

var markers = [];
var annotations = [];
app.controller('AppCtrl', ['$scope', '$modal', 'dialog',
  function($scope, $modal, $dialog) {

    var codeEditor;

    /*
     * Set root scope properties
     */
    $scope.fsTree = watcher.tree;
    $scope.fsList = watcher.list;
    $scope.sessions = sessionManager.sessions;
    $scope.activeSession = null;

    watcher.on('change', function() {
      $scope.fsTree = watcher.tree;
      $scope.fsList = watcher.list;
      $scope.$apply();
    });

    watcher.on('unlink', function(fso) {
      var session = sessionManager.getSession(fso.path);
      if (session) {
        removeSession(session);
      }
    });

    sessionManager.on('change', function() {
      $scope.$apply();
    });

    function removeSession(session) {

      // check if it's the active session
      if ($scope.activeSession === session) {
        $scope.getEditor().clearSession();
        $scope.activeSession = null;
      }

      // todo: sort this out //
      // remove the session
      setTimeout(function() {
        // do this after a short delay to avoid
        // Error: $rootScope:inprog. Action Already In Progress
        sessionManager.remove(session.fso.path);
      }, 1);

    }

    function saveSession(session) {
      var path = session.fso.path;
      var contents = session.getValue();
      filesystem.writeFile(path, contents, function(response) {
        if (response.err) {
          $dialog.alert({
            title: 'File System Write Error',
            message: JSON.stringify(response.err)
          });
        } else {
          session.markClean();
        }
      });
    }

    function initializeCodeEditor() {
      codeEditor = new Editor(document.getElementById('code-editor'));

      codeEditor.on('save', function(session) {
        saveSession(session);
      });

      codeEditor.on('saveall', function() {
        var sessions = sessionManager.sessions;
        for (var path in sessions) {
          var session = sessions[path];
          if (session.isDirty()) {
            saveSession(session);
          }
        }
      });

      codeEditor.on('help', function() {
        $modal.open({
          templateUrl: 'keyboard-shortcuts.html',
          controller: function SimpleModalCtrl($scope, $modalInstance) {
            $scope.ok = function() {
              $modalInstance.close();
            };
          },
          size: 'lg'
        });
      });

      return codeEditor;
    }

    $scope.getEditor = function() {
      return codeEditor || initializeCodeEditor();
    };

    $scope.open = function(fso) {
      console.log('here');
      var existing = sessionManager.getSession(fso.path);
      if (!existing) {
        filesystem.readFile(fso.path, function(response) {
          var data = response.data;

          var session = new Session(data);
          sessionManager.add(data.path, session);
          openSession(session);
        });
      } else {
        openSession(existing);
      }
      // load and mark warnings
      try {
        // analyse the file path, example file path:
        // /Users/jacksongl/macos-workspace/research/jalangi/github_dlint_public/websites/www.youtube.com/src/eval_code3.js
        var result = fso.path.match(/(.*\/websites\/)([^\/]+)\/(.*)/);
        var baseDIR, urlDIR, filePath, fname;
        if (result) {
          baseDIR = result[1];
          urlDIR = result[2];
          filePath = result[3];
          fname = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.length);

          // grab the warnings related to this file
          var warningPath = baseDIR + urlDIR + '/' + 'analysisResults.json';
          filesystem.readFile(warningPath, function(response) {
            if(!response || !response.data || !response.data.contents) return;
            var data = response.data.contents;
            var warnings = JSON.parse(data);
            if (warnings[0])
              warnings = warnings[0].value;
            if (!warnings) {
              return;
            }
            // grab the editor
            var editor = $scope.getEditor();
            for (var i = 0; i < markers.length; i++) {
              editor.getSession()._session.removeMarker(markers[i]);
            }
            // editor.getSession()._session.clearAnnotations();
            annotations = [];
            editor.getSession()._session.setOption("useWorker", false);

            for (var i = 0; i < warnings.length; i++) {
              var locationString = warnings[i].locationString;
              // "(/Users/jacksongl/macos-workspace/research/jalangi/github_dlint_public/instrumentFF_tmp/httpss.ytimg.comytsjsbinspf-vflSKkZoCspf.js:7:1042:7:1061)"
              var result = locationString.match(/instrumentFF_tmp\/([^:]+):(\d+):(\d+):(\d+):(\d+)/);
              if (result) {
                var filename = result[1];
                var startLine = result[2];
                var startCol = result[3];
                var endLine = result[4];
                var endCol = result[5];
                if (filename === fname) {
                  var marker_id = editor.getSession()._session.addMarker(new Range(startLine - 1, startCol - 1, endLine - 1, endCol - 1), "errorHighlight", "background", false);
                  markers.push(marker_id);
                  var textMsg = warnings[i].details + '';
                  textMsg = textMsg.replace(locationString, '(line: ' + startLine + ', col: ' + startCol + ')');
                  if(warnings[i].debugInfo) {
                    textMsg += '\n' + JSON.stringify(warnings[i].debugInfo, 0, 2);
                  }
                  // add warning message as annotation into the code
                  annotations.push({
                    row: startLine - 1,
                    column: startCol - 1,
                    text: textMsg,
                    type: "warning"
                  });
                  editor.getSession()._session.setAnnotations(annotations);
                }
              }
            }
          });
        }
      } catch (ex) {
        console.log(ex);
      }

    };

    $scope.clickSession = function(e, session) {
      // activate or close
      if (e.target.className === 'close') {
        closeSession(session);
      } else {
        openSession(session);
      }
    };

    function openSession(session) {
      $scope.activeSession = session;
      $scope.getEditor().setSession(session);
    }

    function closeSession(session) {
      removeSession(session);
    }
  }
]);