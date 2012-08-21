var path 		= require('path');
var util		= require('util');
var request		= require('superagent');
var assert 		= require('assert')
var debug 		= require('debug')('Discovery');

describe('Discovery Service', function(){
	describe('Using_Google_API_Discovery_Document', function(){
		describe('is accessible', function() {
			it('should exists', function(done){
				var doc_url = url+ discovery_href;
				debug("Checking discovery_url:"+doc_url);
		
				request
				.get( doc_url)
				.end( function(res) {
					res.status.should.equal(200);
					discovery_doc = res.body;
					done();
				})
			})
			
			it('should be available from end point url and json extension', function(done){
				var doc_url = url+ ".json";		
				request
				.get( doc_url)
				.end( function(res) {
					res.status.should.equal(200);
					done();
				})
			})
			it('should be available from end point url with proper Accept Headers', function(done){
				var doc_url = url;
				request
				.get( doc_url)
				.set('Accept', 'application/json')
				.end( function(res) {
					res.status.should.equal(200);
					done();
				})
			})
		})
		describe('contains API metadata', function() {
			it('should contain service metadata', function(){
				discovery_doc.should.have.property('id');
				discovery_doc.should.have.property('name');
				discovery_doc.should.have.property('version');
				discovery_doc.should.have.property('title');
				discovery_doc.should.have.property('description');
			})
			it('should contain resource collections', function(){
				discovery_doc.should.have.property('resources');
			})
			it('should contain schemas', function(){
				discovery_doc.should.have.property('schemas');
			})
			it('should contain security protocol', function(){
				discovery_doc.should.have.property('auth');
			})
		})
	})
});