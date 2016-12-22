var Promise = require("bluebird");
var dir = require('node-dir');
var fs = require('fs');
var yaml = require('js-yaml');
var SwaggerParser = require('swagger-parser');
var SwaggerMerge = require('swagger-merge');
var _ = require('lodash');

Promise.promisifyAll(fs);
Promise.promisifyAll(dir);
Promise.promisifyAll(SwaggerParser);

exports.preparePromise = function(specDir, specFile, infoFile, host, schemes, basePath) {
  return dir.promiseFiles(specDir)
  .then((files) => {
    return files.filter(function(file) {
      return file.endsWith(specFile);
    });
  })
  .then((files) => {
    return Promise.all(files.map(function(file) {
      return SwaggerParser.validate(file, {
        "allowUnknown": false,
      });
    }))
    .then((apis) => {
      SwaggerMerge.on('warn', function (msg) {
        throw new Error(msg);
      });
      var info = yaml.safeLoad(fs.readFileSync(infoFile, 'utf8'));
      return SwaggerMerge.merge(apis, info, basePath, host, schemes)
    })
    .then((merged) => {
      return SwaggerParser.bundleAsync(merged)
    })
    .then((unsorted) => {
      unsorted.tags = _.sortBy(unsorted.tags, 'name');
      return unsorted;
    })
    .catch(e => {
      Promise.reject(e);
    });
  });
}

exports.prepare = function(specDir, specFile, infoFile, host, schemes, basePath, callback) {
  this.preparePromise(specDir, specFile, infoFile, host, schemes, basePath)
  .then((apis) => {
    callback(null, apis);
  })
  .catch(e => {
    callback(e, null);  
  });
}

exports.write = function(specDir, specFile, infoFile, host, schemes, basePath, outputFile, callback) {
  this.preparePromise(specDir, specFile, infoFile, host, schemes, basePath, outputFile)
  .then((apis) => {
    fs.writeFileAsync(outputFile, JSON.stringify(apis), {})
    .then(() => {
      callback(null);
    });
  })
  .catch(e => {
    callback(e, null);  
  });
}
