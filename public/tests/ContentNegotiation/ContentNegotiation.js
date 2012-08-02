var util 			= require('util');
var _ 				= require('underscore');
var request			= require('superagent');
var async			= require('async');
var chai			= require('chai');
var AssertionError	= chai.AssertionError;
var debug 			= require('debug')('tests:Content_Negotiation');

describe('Content_Negotiation', function() {

	function add_url( path, m ) {
		var h = {
			'path': 	path + m['path'],
		}
		resources_urls.push( h )
	}

	
	before( function(done) {
		try {
			// let's make sure we have a discovery document that points to a list of resources
			resources_urls = [];
		
			if( discovery_doc ) {
				var path = url + discovery_doc['basePath'];
			
				var resources = discovery_doc['resources'];
			
				_.each(resources, function(k,v) {
					if( k && k.methods ) {
						_.each(k.methods, function(which, name) {
							// focus on list methods					
							if( name == 'list') add_url( path, which)
						})
					}
				})			
			} else {
				console.error("no discovery_doc");
			}
			debug("resources:"+util.inspect(resources_urls))
			done()
		} catch(e) { console.error("** CN Exception:"+e)}
	});
	
	
	require('./Headers.js');
	require('./Suffixes.js');
	require('./MimeTypes.js');
})
