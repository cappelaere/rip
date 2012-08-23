var path 	= require('path');
var request	= require('superagent');
var util	= require('util');
var should  = require('chai').should();
var xml2js	= require('xml2js');
var debug 	= require('debug')('tests:OpenSearch');

describe('OpenSearch Document', function(){
	var xmlDoc;
	var xmlParser;
	var html_search_url;
	var atom_search_url;
	
	before( function(done) {
		xmlParser = new xml2js.Parser();
		done()
	})
	
	describe('is accessible', function() {
		it('should be discoverable from landing page', function(done){
			var doc_url = url+ opensearch_href;
			debug("Checking Opensearch doc:"+doc_url);
			request
			.get(doc_url)
			.end( function(res) {
				res.status.should.equal(200);
				debug("body:"+util.inspect(res.text));
					
				xmlParser.parseString(res.text, function (err, result) {
			        xmlDoc = result;
			        //debug('Done:'+util.inspect(xmlDoc));
					done();
			    });
			});
		})
		it('should be contain a URL of type text/html', function(done){
			should.exist(xmlDoc);
			
			for( var at_url in xmlDoc['Url'] ) {
				var at_url 	= xmlDoc['Url'][at_url];
				var surl 	= at_url['@']
				var type 	= surl['type'];
				if( type == 'text/html') {
					html_search_url = surl['template'];
					debug("html_search_url defined:"+html_search_url)
					done();
				}
			}
		})
		it('should be contain a URL of type application/atom+xml', function(done){
			should.exist(xmlDoc);
			for( var at_url in xmlDoc['Url'] ) {
				var at_url  = xmlDoc['Url'][at_url];
				var surl 	= at_url['@']
				var type 	= surl['type'];
				if( type == 'application/atom+xml') {
					atom_search_url = surl['template'];
					debug("atom_search_url defined:"+atom_search_url)
					done();
				}
			}
		})
	})
	describe('HTML API Search', function() {
		it('should return valid HTML', function(done) {
			if( html_search_url) {
				var surl = html_search_url.replace(/{searchTerms}}/, "*");
					debug("getting html_search_url:"+surl)
					request
					.get( surl)
					.end( function(res) {
						res.status.should.equal(200);
						done();
					});
			
			} else {
				debug("not html_search_api defined");
				done();
			}
		})
	})
	describe('Atom API Search', function() {
		it('should return a valid Atom Feed', function(done) {
			if( atom_search_url ) {
				var surl = atom_search_url.replace(/{searchTerms}}/, "*");
					debug("getting atom_search_url:"+surl)
					request
					.get( surl)
					.end(function(res) {
						res.status.should.equal(200);
					
						xmlParser.parseString(res.text, function (err, result) {
					        xmlDoc = result;
							done();
					    });
					});
			
			} else {
				debug("no atom_search_api defined");
				done();
			}
		})
	})
})