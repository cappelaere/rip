var util 			= require('util');
var request			= require('request');
var cheerio			= require('cheerio');
var chai			= require('chai');
var AssertionError	= chai.AssertionError;
var debug 			= require('debug')('tests:LandingPage');

describe('Landing_Page', function(){
	
	before( function(done) {
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
		it('should contain a link to Discovery API Document', function(done) {
			var head = $('head');
			var link = head.find('link[rel=discovery]')
			if( link && link.length>0) {
				discovery_href = link.attr('href');
				debug("discovery_href:"+discovery_href)
				done();
			} else {
				throw new AssertionError({'message':"discovery document link not found"});
			}
		})

		it('should contain a link to OpenSearch Document', function(done) {
			var head = $('head');
			var link = head.find('link[rel=search]')
			if( link && link.length>0) {
				opensearch_href = link.attr('href');
				debug("opensearch_href:"+opensearch_href)
				done();
			} else {
				throw new AssertionError({'message':"opensearch document link not found"});
			}
		})

		it('should contain a link to API Explorer', function(done) {
			var head = $('head');
			var link = head.find('link[rel=explorer]')						
			if( link && link.length>0 ) {
				explorer_href = link.attr('href');
				debug("explorer_href:"+explorer_href)
				done();
			} else {
				console.log("NO LINK")
				throw new AssertionError({'message':'API explorer document link not found'});
			}
		})
		
		it('should contain a link to Documentation', function(done) {
			var head = $('head');
			var link = head.find('link[rel=docs]')
			if( link && link.length>0) {
				docs_href = link.attr('href');
				debug("docs_href:"+docs_href)
				done();
			} else {
				throw new AssertionError({'message':"Docs link not found"});
			}
		})
	})
})
