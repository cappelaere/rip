var path 		= require('path');
var util		= require('util');
var request		= require('superagent');
var assert 		= require('assert')
var debug 		= require('debug')('APIExplorer');

describe('API Explorer', function(){
	var explorer_href;
	
	describe('link can be discovered', function(){
		it('should exists', function(done) {
			var head = $('head');
			var link = head.find('link[rel=explorer]')
			if( link && link.length>0) {
				explorer_href = link.attr('href');
				done();
			} else {
				throw new AssertionError({'message':"API Explorerlink not found"});
			}
		});
		it('should be accessible', function(done) {
			try {
				request
				.get( explorer_href )
				.end( function(res) {
					res.status.should.equal(200);
					done();
				}).on("error", function(e) {
					throw new AssertionError({'message':"http error:"+e+" accessing:"+explorer_href});
					done();
				});
			} catch(e) {
				throw new AssertionError({'message':"Exception:"+e});
				done();
			}
		});
	})
});
		