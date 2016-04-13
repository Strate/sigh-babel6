import _ from 'lodash'
import Promise from 'bluebird'
import { Bacon } from 'sigh-core'
import { mapEvents } from 'sigh-core/lib/stream'

function babel6Task(opts) {
  // this function is called once for each subprocess in order to cache state,
  // it is not a closure and does not have access to the surrounding state, use
  // `require` to include any modules you need, for further info see
  // https://github.com/ohjames/process-pool
  var log = require('sigh-core').log
  var babel = require('babel-core');

  // this task runs inside the subprocess to transform each event
  return event => {
    var res = babel.transform(
      event.data,
      {
        filename: event.projectPath,
        extends: opts.babelrc,
        sourceMaps: true
      }
    )
    // TODO: data = compile(event.data) etc.

    return { code: res.code, map: res.map }
  }
}

function adaptEvent(compiler) {
  // data sent to/received from the subprocess has to be serialised/deserialised
  return event => {
    if (event.type !== 'add' && event.type !== 'change') {
      return event
    }


    if (event.fileType !== 'jsx' && event.fileType !== 'js') {
      return event
    }

    return compiler(_.pick(event, 'type', 'data', 'path', 'projectPath')).then(({code, map}) => {
      event.data = code

      if (map) {
        event.applySourceMap(map)
      }

      event.changeFileSuffix('js')
      return event
    })
  }
}

var pooledProc

export default function(op, opts = {}) {
  if (! pooledProc)
    pooledProc = op.procPool.prepare(babel6Task, opts)

  return mapEvents(op.stream, adaptEvent(pooledProc))
}
