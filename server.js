import budo from 'budo';
import babelify from 'babelify';
import hotModuleReloading from 'browserify-hmr';
import brfs from 'brfs';

budo('./index.js', {
  serve: 'bundle.js',
  live: '*.{css,html}',
  port: 8000,
  stream: process.stdout,
  browserify: {
    transform: [babelify, brfs],
    plugin: hotModuleReloading
  }
});
