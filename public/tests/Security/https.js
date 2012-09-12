var debug 			= require('debug')('tests:Start');
var request			= require('superagent');
var https 			= require('https');
var util			= require('util');
var URL				= require('url');
var chai			= require('chai');
var AssertionError	= chai.AssertionError;

describe('Security', function() {
	describe('HTTPS', function() {
		it('should be able to access end point using https', function(done) {
			try {
				var u = URL.parse(url)
				var options = {
					host: 	u.hostname,
					port: 	443,
					method: 'GET'
				}
				console.log(util.inspect(options))
				var req = https.request(options, function(res) {
				  //console.log("statusCode: ", res.statusCode);
				  //console.log("headers: ", res.headers);

				  res.on('data', function(d) {
					console.log("secure data:"+d)
					done()
				  });
				});
				req.end();

				req.on('error', function(e) {
					console.error(util.inspect(e))
					throw new AssertionError({'message':e.errno})
				});
				
			} catch(e) {
				console.log("security exception:"+e)
			}
		})
	})
	describe('Cross-site request forgery', function() {
		it('should require a CSRF token in POST request body, query string or header', function() {
		})
		it('should NOT include CSRF token in GET requests', function() {
		})
	})
})