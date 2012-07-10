var path 	= require('path');
var request	= require('request');
var util	= require('util');
var should  = require('chai').should();

describe('API_Discovery_Document', function(){
	describe('is accessible', function() {
		it('should exists', function(done){
			var doc_url = url+ discovery_href;
			console.log("Checking discovery_url:"+doc_url);
			try {
				request.get( doc_url, function(err, res, _body) {
					res.statusCode.should.equal(200);
					discovery_doc = JSON.parse(_body);
					done();
				}).on("error", function(e) {
					console.log("http error:"+e+" accessing:"+doc_url);
					done();
				});
			} catch(e) {
				console.log("Exception:"+e);
				done();
			}
		})
	})
	describe('contains API metadata', function() {
		it('should be contain service metadata', function(){
			discovery_doc.should.have.property('id');
			discovery_doc.should.have.property('name');
			discovery_doc.should.have.property('version');
			discovery_doc.should.have.property('title');
			discovery_doc.should.have.property('description');
		})
		it('should be contain resource collections', function(){
			discovery_doc.should.have.property('resources');
		})
		it('should be contain schemas', function(){
			discovery_doc.should.have.property('schemas');
		})
		it('should be contain security protocol', function(){
			discovery_doc.should.have.property('auth');
		})
	})
})