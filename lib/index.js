'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sighCore = require('sigh-core');

var _sighCoreLibStream = require('sigh-core/lib/stream');

function babel6Task(opts) {
  // this function is called once for each subprocess in order to cache state,
  // it is not a closure and does not have access to the surrounding state, use
  // `require` to include any modules you need, for further info see
  // https://github.com/ohjames/process-pool
  var log = require('sigh-core').log;
  var babel = require('babel-core');

  // this task runs inside the subprocess to transform each event
  return function (event) {
    var res = babel.transform(event.data, {
      filename: event.path,
      'extends': opts.babelrc,
      sourceMaps: true
    });

    res.map.sources = [event.sourcePath];

    return { code: res.code, map: res.map };
  };
}

function adaptEvent(compiler) {
  // data sent to/received from the subprocess has to be serialised/deserialised
  return function (event) {
    if (event.type !== 'add' && event.type !== 'change') {
      return event;
    }

    if (event.fileType !== 'jsx' && event.fileType !== 'js') {
      return event;
    }

    return compiler(_lodash2['default'].pick(event, 'type', 'data', 'path', 'projectPath', 'basePath', 'sourcePath')).then(function (_ref) {
      var code = _ref.code;
      var map = _ref.map;

      event.data = code;

      if (map) {
        event.applySourceMap(map);
      }

      event.changeFileSuffix('js');
      return event;
    });
  };
}

var pooledProc;

exports['default'] = function (op) {
  var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  if (!pooledProc) pooledProc = op.procPool.prepare(babel6Task, Object.assign({ cwd: process.cwd() }, opts));

  return (0, _sighCoreLibStream.mapEvents)(op.stream, adaptEvent(pooledProc));
};

module.exports = exports['default'];
//# sourceMappingURL=index.js.map