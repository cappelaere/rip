var util 			= require('util');
var request			= require('superagent');
var async			= require('async');
var _				= require('underscore');
var chai			= require('chai');
var AssertionError	= chai.AssertionError;

describe('uses Accept and Content-Type headers', function() {
	var urls = [];

	before( function(done) {
		// we need to filter out the templated urls 
		urls = _.map(resources_urls, function(url) {
			var path = url['path'];
			return path.replace(".{fmt}", "")
		})
		done();
	})

	describe('should support Accept & Content-type headers', function() {
		it( 'should support text/html Accept header and return text/html Content-type', function(done) {

			if( urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});
			
			async.forEachSeries( urls, function( u, callback ) {	
				request
				.get(u)
				.set('Accept', 'text/html')
				.end( function(res) {
					try {
						res.status.should.equal(200)
						console.log("Checked:"+u)				
						res.headers['content-type'].should.contain('text/html')
						callback();
					} catch(e) {
						callback(u+" "+e)
					}
				})
			}, function(err) { 
				if( err ) throw new AssertionError({'message': err});
				done(); 
			});
		})
		
		it( 'should support application/json Accept header and return application/json Content-type', function(done) {
	
			if( urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});
			async.forEachSeries( urls, function( u, callback ) {	
				request
				.get(u)
				.set('Accept', 'application/json')
				.end( function(res) {
					try {
						res.status.should.equal(200)
						console.log("Checked:"+u)				
						res.headers['content-type'].should.contain('application/json')
						callback();
					} catch(e) {
						callback(u+" "+e)
					}
				})
			}, function(err) { 
				if( err ) throw new AssertionError({'message': err});
				done(); 
			});
		})
		
		it( 'should return 406 on bad Accept', function(done) {	
			if( urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});
			async.forEachSeries( urls, function( u, callback ) {	
				request
				.get(u)
				.set('Accept', 'application/rip_me')
				.end( function(res) {
					try {
						console.log("Checked:"+u)				
						res.status.should.equal(406)
						callback();
					} catch(e) {
						callback(u+" "+e)
					}
				})
			}, function(err) { 
				if( err ) throw new AssertionError({'message': err});
				done(); 
			});
			
		})
	})
})