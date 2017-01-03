const oam = require("../lib/index");
const _         = require("lodash");
const should    = require('should');
const fs = require('fs');

const specDir = './test/';
const specFile = 'openapi.json';
const infoFile = './test/info.yaml';
const host = 'api.test.com';
const schemes = ['http', 'https'];
const basePath = '/';
const outputFile = './test/swagger.json'

describe('openapi-merge', function() {
	describe('#prepare()', function(){
		it('should merge two openapi specs', function(done) {
			oam.prepare(specDir, specFile, infoFile, host, schemes, basePath, {}, function(err, apis) {
				if (err) {
					done(err);
				} else {
					apis.should.not.be.null;
					apis.should.not.be.undefined;
					apis.info.version.should.eql('1.0');
					apis.info.title.should.eql('Merged OpenAPI');
					apis.basePath.should.eql(basePath);
					apis.host.should.eql(host);
					apis.schemes.should.have.size(2);
					apis.paths.should.be.a.Array;
					apis.paths.should.have.size(4);
					apis.parameters.should.have.size(2);
					apis.responses.should.have.size(2);
					
					done();
				}
			});
		});
	});

  describe('#prepare()', function(){
		it('should merge two openapi specs with filters', function(done) {
			oam.prepare(specDir, specFile, infoFile, host, schemes, basePath, 
          {visibilityFilter: "EXTERNAL", statusFilter: "RELEASED"}, function(err, apis) {
				if (err) {
					done(err);
				} else {
					apis.should.not.be.null;
					apis.should.not.be.undefined;
					apis.info.version.should.eql('1.0');
					apis.info.title.should.eql('Merged OpenAPI');
					apis.basePath.should.eql(basePath);
					apis.host.should.eql(host);
					apis.schemes.should.have.size(2);
					apis.paths.should.be.a.Array;
					apis.paths.should.have.size(2);
					apis.parameters.should.have.size(2);
					apis.responses.should.have.size(2);
					
					done();
				}
			});
		});
  });

  describe('#write', function() {
    it('should save merged specs', function(done) {
			oam.write(specDir, specFile, infoFile, host, schemes, basePath, outputFile, {}, 
				function(err) {
					if (err) {
						done(err);
					}
					fs.stat(outputFile, function(err, stats) {
						if (err) {
							done(err);
						} else {
							stats.isFile().should.be.true;
					    done();
						}
					});
			});
    });
  });
});


