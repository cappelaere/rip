var util 	= require('util');
var _ 		= require('underscore');
var request	= require('superagent');
var async	= require('async');
var chai	= require('chai');
//var assert	= require('assert');

var AssertionError	= chai.AssertionError;

describe('Content_Negotiation', function() {

	function add_url( path, m ) {
		var h = {
			'path': 	path + m['path'],
		}
		resources_urls.push( h )
	}

	
	before( function(done) {
		// let's make sure we have a discovery document that points to a list of resources
		resources_urls = [];
			
		if( discovery_doc ) {
			var path = url + discovery_doc['basePath'];
			
			var resources = discovery_doc['resources'];
			//console.log("building resources..."+ util.inspect(resources));
			
			_.each(resources, function(k,v) {
				//console.log("resources:"+ util.inspect(k)+ " - "+ util.inspect(v))
				if( k && k.methods ) {
					_.each(k.methods, function(which, name) {
						//console.log("method:"+util.inspect(which));
						// focus on list methods					
						if( name == 'list') add_url( path, which)
					})
				}
			})
			
			//console.log("resources:"+util.inspect(resources_urls));
			
		} else {
			console.log("no discovery_doc");
		}
		done()
	});
	
	require('./Headers.js');
	require('./Suffixes.js');
	require('./MimeTypes.js');

})
