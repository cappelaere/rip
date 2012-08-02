var path 			= require('path');
var request			= require('request');
var util			= require('util');
var _				= require('underscore');
var chai  			= require('chai');
var AssertionError	= chai.AssertionError;
var debug 			= require('debug')('tests:Geoservices');

describe('GeoService_Discovery_Catalog', function() {
	
	describe('is accessible', function() {
		it('should exists', function(done){
			var doc_url = url+ "?f=json";
			debug("Checking discovery_url:"+doc_url);
			try {
				request.get( doc_url, function(err, res, _body) {
					res.statusCode.should.equal(200);
					discovery_doc = JSON.parse(_body);
					done();
				}).on("error", function(e) {
					throw new AssertionError({'message':"http error:"+e+" accessing:"+doc_url});
					done();
				});
			} catch(e) {
				throw new AssertionError({'message':"Exception:"+e});
				done();
			}
		})
		
		it('should be accessible using proper Accept headers as well', function(done){
			request.get( { 'url': url, 'headers': { 'content-type': 'application/json'} }, function(err, res, _body) {
				res.statusCode.should.equal(200);
				try {
					isjson = JSON.parse(_body);
				} catch(e) {
					throw new AssertionError({'message':"JSON not returned"});
				}
				done();
			}).on("error", function(e) {
				throw new AssertionError({'message':"http error:"+e+" accessing:"+doc_url});
				done();
			});			
		});
	})
	
	describe('contains API metadata', function() {
		
		it('should contain service metadata', function(){
			//discovery_doc.should.have.property('specVersion');
			discovery_doc.should.have.property('currentVersion');
		})
		
		it('should contain services collections', function(){
			discovery_doc.should.have.property('services');
		})
		
		it('should contain folders', function(){
			discovery_doc.should.have.property('folders');
		})
	})

	describe('points to services catalogs', function() {
		it('services should have their own description documents', function(done) {
			var services = discovery_doc['services'];
			_.each( services, function(s) {
				var surl = url + "/" + s['name'] + "/" + s['type'] + "?f=json&pretty=true";
				debug("check service:"+surl);
				try {
					request.get( surl, function(err, res, _body) {
						if( res ) res.statusCode.should.equal(200);	
					}).on("error", function(e) {
						throw new AssertionError({'message':"http error:"+e+" accessing:"+surl});
					});
				} catch(e) {
					throw new AssertionError({'message':"Exception:"+e});
				}
			})
			done();
		})		
	})
	
	describe("Service document contains metadata", function() {
		
		it('service description is available', function(done) {
			var services = discovery_doc['services'];
			var s = services[0];
			var surl = url + "/" + s['name'] + "/" + s['type'] + "?f=json&pretty=true";

			request.get( surl, function(err, res, _body) {
				service_doc = JSON.parse(_body);
				done();
			});
		})
		
		it('service description document should contain description', function() {
			service_doc.should.have.property('description');
		})

		it('service description document should contain version', function() {
			service_doc.should.have.property('currentVersion');
		})

		it('service description document should contain list of published resources', function() {
			throw new AssertionError({'message':'no published resources'});
		})

		it('service description document should contain list of schemas', function() {
			throw new AssertionError({'message':'no published schemas'});
		})

		it('service description document should contain security information', function() {
			throw new AssertionError({'message':'no security information'});
		})

	})
	
	describe('points to folders catalogs', function() {
		it('folders should have their own description documents', function(done) {
			var folders = discovery_doc['folders'];
			_.each( folders, function(f) {
				var surl = url + "/" + f + "?f=json&pretty=true";
				deubg("check folder:"+surl);
				try {
					request.get( surl, function(err, res, _body) {
						if( res ) res.statusCode.should.equal(200);	
					}).on("error", function(e) {
						throw new AssertionError({'message':"http error:"+e+" accessing:"+surl});
					});
				} catch(e) {
					throw new AssertionError({'message':"Exception:"+e});
				}
			})
			done();
		})
	})
	
})