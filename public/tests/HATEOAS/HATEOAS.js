describe('Hypermedia As The Engine Of State', function() {
	before( function(done) {
		console.log("HATEOAS")
		done();
	})

	describe('it should use embedded links in resources', function() {
		if( params['JSONExtension'] == 'HAL') {
			require(__dirname+'/HAL.js')
		}

		if( params['JSONExtension'] == 'Siren') {
			require(__dirname+'/Siren.js')
		}
	})
})