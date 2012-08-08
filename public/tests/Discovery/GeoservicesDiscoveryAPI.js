var path 			= require('path');
var request			= require('superagent');
var util			= require('util');
var _				= require('underscore');
var chai  			= require('chai');
var should			= chai.should();
var AssertionError	= chai.AssertionError;
var debug 			= require('debug')('tests:Geoservices');

describe('Discovery Service', function(){
	describe('Using_GeoServices_Discovery_Catalog', function() {
	
		describe('is accessible', function() {
			it('should exists', function(done){
				var doc_url = url+ "?f=json";
				debug("Checking discovery_url:"+doc_url);
				try {
					request
					.get( doc_url )
					.end( function(res) {
						res.status.should.equal(200);
						try {
							discovery_doc = JSON.parse(res.text);
						} catch(e) {
							throw new AssertionError({'message': 'not a json document'});							
						}
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
				request
				.get( url )
				.set('Content-Type','application/json') 
				.end( function(res) {
					res.status.should.equal(200);
					try {
						isjson = JSON.parse(_body);
					} catch(e) {
						throw new AssertionError({'message':"JSON not returned"});
					}
					done();
				});			
			});
		})
	
		describe('contains API metadata', function() {
		
			it('should contain service metadata', function(){
				//discovery_doc.should.have.property('specVersion');
				should.exist(discovery_doc)
				discovery_doc.should.have.property('currentVersion');
			})
		
			it('should contain services collections', function(){
				should.exist(discovery_doc)
				discovery_doc.should.have.property('services');
			})
		
			it('should contain folders', function(){
				should.exist(discovery_doc)
				discovery_doc.should.have.property('folders');
			})
		})

		describe('points to services catalogs', function() {
			it('services should have their own description documents', function(done) {
				should.exist(discovery_doc)
				var services = discovery_doc['services'];
				_.each( services, function(s) {
					var surl = url + "/" + s['name'] + "/" + s['type'] + "?f=json&pretty=true";
					debug("check service:"+surl);
					
					request
					.get( surl )
					.end( function(res) {
							if( res ) res.status.should.equal(200);	
					})
				})
				done();
			})		
		})
	
		describe("Service document contains metadata", function() {
		
			it('service description is available', function(done) {
				should.exist(discovery_doc)
				var services = discovery_doc['services'];
				var s = services[0];
				var surl = url + "/" + s['name'] + "/" + s['type'] + "?f=json&pretty=true";

				request
				.get( surl )
				.end( function(res) {
					service_doc = JSON.parse(res.text);
					done();
				});
			})
		
			it('service description document should contain description', function() {
				should.exist(service_doc)
				service_doc.should.have.property('description');
			})

			it('service description document should contain version', function() {
				should.exist(service_doc)
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
				should.exist(discovery_doc)
				var folders = discovery_doc['folders'];
				_.each( folders, function(f) {
					var surl = url + "/" + f + "?f=json&pretty=true";
					debug("check folder:"+surl);
					
					request
					.get( surl )
					.end(function(res) {
						res.status.should.equal(200);	
					})
				})
				done();
			})
		})
	
	})
})