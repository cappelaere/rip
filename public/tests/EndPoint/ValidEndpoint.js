var request			= require('request');
var should 			= require('chai').should();
var debug 			= require('debug')('tests:Caching');

function Abort (message) {
  this.message = message;
}

Abort.prototype = Object.create(Error.prototype);
Abort.prototype.name = 'Abort';
Abort.prototype.constructor = Abort;


describe('End_Point', function(){
	//console.log("Checking myvars describe:"+ util.inspect(this))

	before( function(done) {
		//console.log("Checking myvars before:"+ util.inspect(this))
		done();
	})
	
	describe('is valid and available', function() {
		
		it('should be up and running', function(done) {
			debug("Checking valid endpoint:"+url)
			//console.log("Checking myvars in it:"+ util.inspect(this))
	
			var start = new Date
			var options = {
				url: 	url,
				method: 'head',
				timeout: 3000
			}
						
			request.head( options, function(err, resp, _body ) {
				try {
					should.not.exist(err);
					resp.statusCode.should.equal(200);
					//this.ok = true;			
					done();
				} catch(e) {
					//this.ok = false;		
					console.log(url+"-"+e)	
					throw new Abort("INVALID END POINT")
				}
			});
		})
	})

})