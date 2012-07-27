var path 	= require('path');
var util	= require('util');
var request	= require('superagent');
//var req		= require('request');
//var should  = require('chai').should();
var assert = require('assert')

describe('Google_API_Discovery_Document', function(){
	describe('is accessible', function() {
		it('should exists', function(done){
			var doc_url = url+ discovery_href;
			console.log("Checking discovery_url:"+doc_url);
		
			request
			.get( doc_url)
			.end( function(res) {
				res.status.should.equal(200);
				discovery_doc = res.body;
				done();
			})
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