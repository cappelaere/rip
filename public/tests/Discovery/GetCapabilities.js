var request			= require('superagent');
var debug 			= require('debug')('Discovery');
var chai			= require('chai');
var AssertionError	= chai.AssertionError;

describe('Discovery Service', function(){
	var result;
	
	describe('GetCapabilities Document', function() {
		it('should be accessible', function(done) {
			var request_url = url + "?REQUEST=GetCapabilities";
			console.log("url:"+request_url);
			request
				.get(request_url)
				.end( function(res) {
					res.status.should.equal(200)
					result = res;
					done();
				})
		})
		
		it('should be content type text/xml', function(done) {
			result.headers['content-type'].should.equal('text/xml')
			done();
		})
		
	})
});