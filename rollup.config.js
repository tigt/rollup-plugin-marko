import jsonLoader from 'rollup-plugin-json';
import commonJsToEsModules from 'rollup-plugin-commonjs';
import nodeModulesResolver from 'rollup-plugin-node-resolve';
import markoPlugin from './marko-rollup-plugin.js';

const isDev = process.env.NODE_ENV === 'development';
const isProduction = !isDev;

export default ({
  input: 'src/index.js',
  plugins: [
    nodeModulesResolver({ // should go first, implements node’s require()
      mainFields: ['module', 'jsnext:main', 'main']
    }),
    jsonLoader(),
    markoPlugin({ target: 'server' }),
    commonJsToEsModules()
  ],
  output: [{
    dir: 'rollup',
    format: 'cjs'
  }],
  // Externalize node_modules/ dependencies that don’t need to be run through markoPlugin
  external: id => {
    if (id.startsWith('.') || id.includes('pirate-kds') || id.includes(__dirname)) {
      return false
    } else {
      return true
    }
  }
});
