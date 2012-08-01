describe('Hypermedia As The Engine Of State', function() {
	before( function(done) {
		done();
	})

	describe('it should use embedded links in resources', function() {
		if( params['ExtendJSON'] && params['JSONExtension'] == 'HAL') {
			require(__dirname+'/HAL.js')
		}

		if( params['ExtendJSON'] && params['JSONExtension'] == 'Siren') {
			require(__dirname+'/Siren.js')
		}
	})
})