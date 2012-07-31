var chai	= require('chai');
var AssertionError	= chai.AssertionError;


describe('No Discovery Document', function() {
	it('should not happen', function(done){
		discovery_doc = null;
		throw new AssertionError({'message':"A discovery document is really required"})
	})
})
