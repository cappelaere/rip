var path 	= require('path');
var request	= require('superagent');
var util	= require('util');
var _  		= require('underscore');
var async	= require('async');

var should  = require('chai').should();
var xml2js	= require('xml2js');

describe('Caching', function(){
	var urls 	= [];
	var feeds 	= [];
	
	before( function(done) {

		// we need to filter out the templated urls 
		urls = _.map(resources_urls, function(url) {
			var path = url['path'];
			return path.replace(".{fmt}", "")
		})
		done();
	})
	
	describe("Caching Headers", function() {
		if( params['AtomExtension'] == 'GData2') {
			describe("GData 2.0 Caching Headers", function() {
				
				it("should use GData-Version 2.0 in headers", function(done) {
					if( urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});

					async.forEachSeries( urls, function( u, callback ) {
						//console.log("H "+u);	
						request
						.get(u)
						.set('Accept', 'application/atom+xml')
						.end( function(res) {
							//console.log( res.headers );
							var gdata = res.headers['GData-Version']
							should.exist(gdata)
							gdata.should.equal('2.0')
							//GData-Version: 2.0
							callback()
						})
					}, function(err) {
						done();
					})
				})

				it("should use ETag in headers", function(done) {
					if( urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});

					async.forEachSeries( urls, function( u, callback ) {
						//console.log("H "+u);	
						request
						.get(u)
						.set('Accept', 'application/atom+xml')
						.end( function(res) {
							//console.log( res.headers );
							var etag = res.headers['ETag']
							should.exist(etag)

							callback()
						})
					}, function(err) {
						done();
					})
				})				

				it("should use Last-Modified in headers", function(done) {
					if( urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});

					async.forEachSeries( urls, function( u, callback ) {
						///console.log("H "+u);	
						request
						.get(u)
						.set('Accept', 'application/atom+xml')
						.end( function(res) {
							//console.log( res.headers );
							var etag = res.headers['Last-Modified']
							should.exist(etag)

							callback()
						})
					}, function(err) {
						done();
					})
				})

				it("should return a 304 Not Modified", function() {
				})

				it("should support Conditional Retrieval with If-None-Match in headers", function() {
				})				
				
				it("should support Conditional Replace with If-Match: <etag> in headers", function() {
				})
				
				it("should support Override Replace with If-Match: * in headers", function() {
				})
				
				it("should support Conditional Delete with If-Match: <etag> in headers", function() {
				})
				
				it("should support Delete with If-Match: * in headers", function() {
				})
			})
		}
	})
	
	describe("Expires Headers", function() {
		it("should use Expires Headers for increase  caching", function() {
			// test for Expires:
			// test for cache-control
		})
	});
	
	describe("Frontend Caching", function() {
		it("should use server-side caching", function() {
			// test for Nginx, Squid or Varnish
		})
	});
	

})
