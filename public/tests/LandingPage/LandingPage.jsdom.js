var util 	= require('util');
var request	= require('request');
var jsdom 	= require('jsdom');

describe('Landing_Page', function(){
	var $;
	
	before( function(done) {
		console.log("Check Landing Page at:"+url);
		try {
			request( url, function(err, resp, _body ) {
				if (err || resp.statusCode != 200) {
				    console.log('Error when contacting:'+url);
				} else {
					var query_file="file://"+app.root+"/public/javascripts/jquery-1.5.min.js";
					console.log("Trying to get query file:"+query_file);
			
					jsdom.env(
						_body,
						[ query_file ]
					,
					function(errors, _window) {
						if( !errors ) {
							$ = _window.jQuery;
							done();
						} else {
							throw("errors:"+errors);
						}
					});
				}
			});
		} catch(e) {
			console.log("Exception before Landing Page:"+e);
		}
	});
	
	describe('uses HTML5', function() {
		it('should use the html5 namespace', function(done) {
			var html = $("html")[0];
			var xmlns = html._attributes['xmlns']
			if( xmlns._nodeValue == 'http://www.w3.org/1999/xhtml') {
				done();
			} else {
				throw "invalid xmlns:"+xmlns;
			}
		})
	})
	
	describe('has links to Discovery Documents in Head', function() {
		it('should contain a link to Discovery API Document', function(done){
			var head = $("head");
			var link = head.find("link.[rel=discovery]")
			if( link ) {
				discovery_href = link.attr('href');
				done();
			} else {
				throw "discovery link not found";
			}
		})
		
		it('should contain a link to OpenSearch Document', function(done){
			var head = $("head");
			var link = head.find("link.[rel=search]")
			if( link ) {
				opensearch_href = link.attr('href');
				done();
			} else {
				throw "opensearch link not found";
			}
		})
	})
})
