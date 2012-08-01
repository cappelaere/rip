var util 			= require('util');
var request			= require('request');
var cheerio			= require('cheerio');
var chai			= require('chai');
var AssertionError	= chai.AssertionError;

describe('Landing_Page', function(){
	
	before( function(done) {
		console.log("Before LandingPage")
		request( url, function(err, resp, _body ) {
			if (err || resp.statusCode != 200) {
				console.error("failed getting url:"+url)
				throw new AssertionError({'message':'Error when contacting:'+url});
			} else {
				try {
					$ = cheerio.load(_body)
					done();
				} catch(e) {
					console.error("failed parsing landing page:"+url)
					throw new AssertionError({'message':"Parsing Landing Page Exception"});
				}
			}
		});
	});

	describe('uses HTML5', function() {
		it('should use the html5 namespace', function(done) {
			var xmlns 	= $('html').attr('xmlns')
			if( xmlns == 'http://www.w3.org/1999/xhtml') {
				done();
			} else {
				throw new AssertionError({ 'message':"invalid xmlns:"+xmlns});
			}
		})
	})
	
	describe('has links to Discovery Documents in Head', function() {
		it('should contain a link to Discovery API Document', function(done){
			var head = $('head');
			var link = head.find('link[rel=discovery]')
			if( link ) {
				discovery_href = link.attr('href');
				//console.log("discovery_href:"+discovery_href)
				done();
			}
		})
		
		it('should contain a link to OpenSearch Document', function(done){
			var head = $('head');
			var link = head.find('link[rel=search]')
			if( link ) {
				opensearch_href = link.attr('href');
				//console.log("opensearch_href:"+opensearch_href)
				done();
			} else {
				throw new AssertionError({'message':"opensearch link not found"});
			}
		})
	})
})
