var util 			= require('util');
var request			= require('superagent');
var async			= require('async');
var _				= require('underscore');
var chai			= require('chai');
var AssertionError	= chai.AssertionError;
var debug 			= require('debug')('tests:Suffixes');

describe('allows representation suffixes', function(){
	var urls = [];

	before( function(done) {
		// we need to filter out the templated urls 
		urls = _.map(resources_urls, function(url) {
			var path = url['path'];
			return path.replace(".{fmt}", "")
		})
		done();
	})
	
	it('should support url.html', function(done){
		if( urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});
		async.forEachSeries( urls, function( u, callback ) {	
			request
			.get(u+".html")
			.end( function(res) {
				try {
					res.status.should.equal(200)
					debug("Checked html suffix:"+u+".html")				
					res.headers['content-type'].should.contain('text/html')
					callback();
				} catch(e) {
					callback(u+".html "+e)
				}
			})
		}, function(err) { 
			if( err ) throw new AssertionError({'message': err});
			done(); 
		});	
	})
	
	it('should support url.json', function(done){
		if( urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});
		async.forEachSeries( urls, function( u, callback ) {	
			request
			.get(u+".json")
			.end( function(res) {
				try {
					res.status.should.equal(200)
					debug("Checked suffix json:"+u+".json")				
					res.headers['content-type'].should.contain('application/json')
					callback();
				} catch(e) {
					callback(u+".json "+e)
				}
			})
		}, function(err) { 
			if( err ) throw new AssertionError({'message': err});
			done(); 
		});		
	})
	
})