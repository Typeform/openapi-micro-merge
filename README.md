# openapi-micro-merge

Node library used to recursively search a directory for a regex or pattern to find OpenAPI specs; subsequently validates, bundles and merges them into one spec. Optionally writes merged spec to a file.

This is very useful for microservice environments where service specs are stored in separate directories, but need to be merged into one file for various purposes (docs, tooling, etc). Intended to be used in CI environments, where validating specs is a critical need.

## Features

* OpenAPI (fka Swagger) 2.0
* Recursive regex or pattern search for specs in directories
* Callbacks or Promises (fast with [Bluebird](http://bluebirdjs.com/))
* YAML or JSON specs supported
  * Info file must be in YAML 
* Validation of each spec
* $ref support, linked specs/schema/parameters
* Sorts tags by name

## Install

```
  npm install openapi-micro-merge
```

## Usage

```
  var microMerge = require('openapi-micro-merge');

  const specDir = './specs/'; // Directory to recursively search
  const specFile = 'openapi.json'; //  a regex pattern or array to find OpenAPI specs
  const infoFile = './test/info.yaml';
  const host = 'api.test.com';
  const schemes = ['http', 'https'];
  const basePath = '/';
  const outputFile = './test/swagger.json'

  // Returns a merged OpenAPI object
  microMerge.prepare(specDir, specFile, infoFile, host, schemes, basePath, 
    function(err, data) {
      console.log(data);
  });

  // Returns a merged OpenAPI object in a Promise
  microMerge.preparePromise(specDir, host, specFile, basePath, infoFile, schemes)
    .then((apis) => {
      console.log(apis);
    });

  // Writes a merged OpenAPI spec
  microMerge.write(specDir, specFile, infoFile, host, schemes, basePath, outputFile, 
    function(err) {
      if (err) {
        console.log(err);
       }
  });
```

## TODO

* [ ] YAML output for merged spec in save()
* [ ] Full dereferencing option instead of bundling
* [ ] Support JSON for info file
* [ ] Tag sorting optional


