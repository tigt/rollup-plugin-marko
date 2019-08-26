import fs from 'fs'
import path from 'path'
import markoCompiler from 'marko/compiler'

// It should be possible to steal the general workflow from the Svelte Rollup plugin:
// https://github.com/rollup/rollup-plugin-svelte/blob/master/index.js

// The best alternative to the ?CODE= querystring used in the original Webpack plugin is probably
// this.emitFile({ type: 'asset' })

markoCompiler.configure({
  checkUpToDate: false, // leaving this on for development purposes, remove before final
  writeToDisk: false,
  writeVersionComment: false,
  sourceOnly: false
})

export default function markoPlugin (options = {}) {
  const isServer = options.target !== 'browser'
  const entryPoints = new Set()

  return {
    name: 'marko',

    resolveId (id, parentId) {
      if (!parentId || id[0] === '.' || id[0] === '\0' || path.isAbsolute(id) || !id.includes('.marko')) {
        return null
      }

      const isEntryPoint = isServer && !parentId.includes('.marko')
      return {
        id: isEntryPoint ? `${id}?assets` : id,
        external: isServer || isMarkoTaglib(id) // I vaguely recall having to mark module taglibs as external for processing later?
      }
    },

    load (id) {
      if (!id.includes('.marko')) { return null }

      if (id.includes('.marko?assets')) {
        entryPoints.add(id.replace('?assets', ''))
        // for Rollup, it seems easier to use this.emitFile({ type: 'chunk' }) for entry points

        // Once the server compilation finishes, it adds `?hydrate` to all of those entries and then resolves the `clientEntries` promise.
        //
        // Then on the client-side compiler there is a plugin that injects a dependency just so we could invalidate the client-side bundle if the server-side entries change (https://github.com/marko-js/webpack/blob/c63eca3ab8238f23558bb3e852bd12d080f9c9f8/src/plugin/index.ts#L236), but ultimately it just adds the `clientEntries` promise as an entry point to Webpack. Webpack can have async entries so this works just fine.
      }

      const compile = isServer ? compileServer : compileBrowser
      const { code, dependencies, meta } = compile(code, id)
      return code
        .concat('\nexport default marko_template;\n') // rollup-plugin-commonjs isn’t smart enough to infer this
    }
  }
}

function compileBrowser (code, id) {
  return markoCompiler.compileForBrowser(code, id, {
    requireTemplates: false
  })
}

function compileServer (code, id) {
  return markoCompiler.compile(code, id)
}

function isMarkoTaglib (id) {
  if (id.startsWith('.') || id.startsWith('/')) {
    return false
  }
  return fs.existsSync(`${__dirname}/node_modules/${id}/marko.json`)
}
