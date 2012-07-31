var util 			= require('util');
var async			= require('async');

//
// Testing for GData 2.0 Feed Extension
//

describe('are extended using GDAta 2.0 protocol', function() {
	it("uses OpenSearch namespace and attributes", function(done) {
		async.forEachSeries( feeds, function( feed, callback ) {
			feed.find('openSearch:totalResults').should.exist;
			feed.find('openSearch:startIndex').should.exist;
			feed.find('openSearch:itemsPerPage').should.exist;
		}, function(err) {
			done();
		})
	})
})
