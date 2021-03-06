var Promise = require("bluebird");
var dir = require('node-dir');
var fs = require('fs');
var yaml = require('js-yaml');
var SwaggerParser = require('swagger-parser');
var SwaggerMerge = require('swagger-merge');
var validate = require('validate.js');
var _ = require('lodash');

Promise.promisifyAll(fs);
Promise.promisifyAll(dir);
Promise.promisifyAll(SwaggerParser);

var constraints = {
  visibilityFilter: {
    exclusion: {
      within: ["EXTERNAL", "INTERNAL"],
      message: "'%{value}' is not allowed"
    }
  },
  statusFilter: {
    exclusion: {
      within: ["PROPOSED", "IN_DEVELOPMENT", "RELEASED"],
      message: "'%{value}' is not allowed"
    }
  },
  stripExtensions: {
    
  }
};

exports.preparePromise = function(specDir, specFile, infoFile, host, schemes, basePath, options) {
  validate(options, constraints);
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
    .catch(e => {
      Promise.reject(e);
    });
  })
  .then((unsorted) => {
    unsorted.tags = _.sortBy(unsorted.tags, 'name');
    return unsorted;
  })
  .then((sorted) => { 
    if (options.visibilityFilter && options.statusFilter) {
      paths = sorted.paths;
      _.forIn(paths, function(value, path) {
        visibility = _.get(value, "x-visibility", "");
        stat = _.get(value, "x-status", "");
        if (visibility !== options.visibilityFilter || visibility === "") {
          delete sorted.paths[path];
        }
        if (stat !== options.statusFilter || stat === "") {
          delete sorted.paths[path];
        }
      });
    }
    return sorted;
  })
  .catch(e => {
    Promise.reject(e);
  });
}

exports.prepare = function(specDir, specFile, infoFile, host, schemes, basePath, options, callback) {
  this.preparePromise(specDir, specFile, infoFile, host, schemes, basePath, options)
  .then((apis) => {
    callback(null, apis);
  })
  .catch(e => {
    callback(e, null);  
  });
}

exports.write = function(specDir, specFile, infoFile, host, schemes, basePath, outputFile, options, callback) {
  this.preparePromise(specDir, specFile, infoFile, host, schemes, basePath, outputFile, options)
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
