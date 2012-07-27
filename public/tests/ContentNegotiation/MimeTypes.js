var util 	= require('util');
var request	= require('superagent');
var async	= require('async');
var chai	= require('chai');
var _		= require('underscore');

var AssertionError	= chai.AssertionError;

describe('support custom mime-types', function(){
	var urls = [];

	before( function(done) {
		// we need to filter out the templated urls 
		urls = _.map(resources_urls, function(url) {
			var path = url['path'];
			return path.replace(".{fmt}", "")
		})
		done();
	})

	it('should extend existing mime-types', function(){
		
	})
	
	it('should use profile extension', function(){
		
	})
	
	it('should point to an available schema', function(){
		
	})
})