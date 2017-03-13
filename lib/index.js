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
  requireCurrentVersion: {
    inclusion: {
      within: [true, false],
      message: "'%{value}' is not allowed"
    }
  },
  visibilityFilter: {
    inclusion: {
      within: ["EXTERNAL", "INTERNAL"],
      message: "'%{value}' is not allowed"
    }
  },
  statusFilter: {
    inclusion: {
      within: ["PROPOSED", "IN_DEVELOPMENT", "RELEASED"],
      message: "'%{value}' is not allowed"
    }
  }
};

exports.preparePromise = function(specDir, specFile, infoFile, host, schemes, basePath, options) {
  var validationResult = validate(options, constraints);
  if (validationResult) {
    return Promise.reject("*** Invalid options:\n  " + _.reduce(Object.keys(validationResult), (result, key) => {
      return result + (key + ":\n    " + validationResult[key].join("\n    "));
    }, ""))
  }
  
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
    if (options.requireCurrentVersion) {
      paths = sorted.paths;
      pathsWithoutVersion = [];
      _.forIn(paths, function(value, path) {
        version = _.get(value, "x-current-version", null);
        if (!version) {
          pathsWithoutVersion.push(path);
        }
      })

      if (pathsWithoutVersion) {
        return Promise.reject("*** Missing 'x-current-version'. Paths affected:\n" + pathsWithoutVersion.join("\n")); 
      }
    }

    return sorted;
  })
  .then((sorted) => { 
    paths = sorted.paths;
    _.forIn(paths, function(value, path) {
      // check visibility
      if (options.visibilityFilter) {
        visibility = _.get(value, "x-visibility", "");
        if (visibility !== options.visibilityFilter || visibility === "") {
          delete sorted.paths[path];
        }
      }

      // check status
      if (options.statusFilter) {
        status = _.get(value, "x-status", "");
        
        if (status !== options.statusFilter || status === "") {
          delete sorted.paths[path];
        }
      }
    });
    return sorted;
  })
  .catch(e => {
    return Promise.reject(e);
  });
}

exports.prepare = function(specDir, specFile, infoFile, host, schemes, basePath, options, callback) {
  this.preparePromise(specDir, specFile, infoFile, host, schemes, basePath, options)
  .then((apis) => {
    callback(apis, null);
  })
  .catch(e => {
    callback(null, e);  
  });
}

exports.write = function(specDir, specFile, infoFile, host, schemes, basePath, outputFile, options, callback) {
  this.preparePromise(specDir, specFile, infoFile, host, schemes, basePath, options)
  .then((apis) => {
    fs.writeFileAsync(outputFile, JSON.stringify(apis), {})
    .then(() => {
      callback(null);
    });
  })
  .catch(e => {
    callback(e);  
  });
}
