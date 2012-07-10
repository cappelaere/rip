var request	= require('request');
var should 	= require('chai').should();

describe('End_Point', function(){
	
	describe('is valid and available', function() {
		it('should be up and running', function(done) {
			console.log("Checking valid endpoint:"+url)
			try {
				var start = new Date
				var options = {
					url: 	url,
					method: 'head',
					timeout: 1000
				}
				request.head( options, function(err, resp, _body ) {
					should.not.exist(err);
					resp.statusCode.should.equal(200);
					done();
				});
			} catch(e) {
				console.log("Exception:"+e);
				done();
			}
		})
	})
})