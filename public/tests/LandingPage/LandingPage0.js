var util 			= require('util');
var request			= require('superagent');
var cheerio			= require('cheerio');
var chai			= require('chai');
var AssertionError	= chai.AssertionError;
var debug 			= require('debug')('tests:LandingPage');

describe('Landing Page', function(){
	var result;
	
	it('should exist', function(done) {
		request
			.get( url )
			.end( function(res) {
				res.status.should.equal(200)
				result = res;
				done()
			})
	})
		
	it('should use content type text/html', function(done) {
		result.status.should.equal(200)
		result.headers['content-type'].should.equal("text/html")
		done();
	})
	
})
