var path 	= require('path');
var request	= require('request');
var util	= require('util');
var should  = require('chai').should();
var xml2js	= require('xml2js');

describe('OpenSearch_Document', function(){
	var xmlDoc;
	var xmlParser;
	var html_search_url;
	var atom_search_url;
	
	before( function(done) {
		xmlParser = new xml2js.Parser();
		done()
	})
	
	describe('is accesible', function() {
		it('should be discoverable from landing page', function(done){
			var doc_url = url+ opensearch_href;
			console.log("Checking Opensearch doc:"+doc_url);
			try {
				request.get( doc_url, function(err, res, _body) {
					res.statusCode.should.equal(200);
					//console.log(_body);
					
					xmlParser.parseString(_body, function (err, result) {
				        xmlDoc = result;
				        //console.log('Done:'+util.inspect(xmlDoc));
						done();
				    });
				});
			} catch(e) {
				console.log("Exception:"+e);
				done();
			}
		})
		it('should be contain a URL of type text/html', function(done){
			for( var at_url in xmlDoc['Url'] ) {
				var at_url 	= xmlDoc['Url'][at_url];
				var surl 	= at_url['@']
				var type 	= surl['type'];
				if( type == 'text/html') {
					html_search_url = surl['template'];
					console.log("html_search_url defined:"+html_search_url)
					done();
				}
			}
		})
		it('should be contain a URL of type application/atom+xml', function(done){
			for( var at_url in xmlDoc['Url'] ) {
				var at_url  = xmlDoc['Url'][at_url];
				var surl 	= at_url['@']
				var type 	= surl['type'];
				if( type == 'application/atom+xml') {
					atom_search_url = surl['template'];
					console.log("atom_search_url defined:"+atom_search_url)
					done();
				}
			}
		})
	})
	describe('HTML API Search', function() {
		it('should return valid HTML', function(done) {
			if( html_search_url) {
				var surl = html_search_url.replace(/{searchTerms}}/, "*");
				try {
					console.log("getting html_search_url:"+surl)
					request.get( surl, function(err, res, _body) {
						//console.log(err, res.statusCode);
						res.statusCode.should.equal(200);
						//console.log(_body);
						done();
					});
				} catch(e) {
					console.log("Exception:"+e);
					done();
				}
			} else {
				console.log("not html_search_api defined");
				done();
			}
		})
	})
	describe('Atom API Search', function() {
		it('should return a valid Atom Feed', function(done) {
			if( atom_search_url ) {
				var surl = atom_search_url.replace(/{searchTerms}}/, "*");
				try {
					console.log("getting atom_search_url:"+surl)
					request.get( surl, function(err, res, _body) {
						//console.log(err, res.statusCode);
						res.statusCode.should.equal(200);
						//console.log(_body);
					
						xmlParser.parseString(_body, function (err, result) {
					        xmlDoc = result;
					        //console.log('Done:'+util.inspect(xmlDoc));
							done();
					    });
					});
				} catch(e) {
					console.log("Exception:"+e);
					done();
				}
			} else {
				console.log("no atom_search_api defined");
				done();
			}
		})
	})
})