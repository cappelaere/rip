var util		= require('util'),
	session		= require('../../app/controllers/session'),
	cfg			= require('../../lib/config');

var source_enum 	= cfg.sources;
var output_formats  = ['json', 'html', 'atom'];

var discover_story_get = function() {
	var	get			= {
		"id": 			"rip.stories.get",
		"path": 		"/ustories/{id}.{fmt}",
		"httpMethod": 	"GET",
		"description": 	"Get specific (previously created) story",
		"parameters": {
			"id": {
				"type": 		"integer",
				"description": 	"Task id",
				"required": 	true,
				"location": 	"path"
			},
			"fmt": {
				"type": 		"string",
				"enum": 		output_formats, 
				"description": 	"output format",
				"required": 	false,
				"default": 		"json", 
				"location": 	"query"  
			},
		},
		"parametersOrder": [ "id", "fmt"],
		"response": {
			"$ref":"Story"
		}
	}
	return get;	
}

var discover_stories_list = function() {
	var stories_list = {
		"id": 			"rip.stories.list",
		"path": 		"/ustories.{fmt}",
		"httpMethod": 	"GET",
		"description": 	"List all previously created stories",
		"parameters": {
			"fmt": {
				"type": 		"string",
				"enum": 		output_formats, 
				"description": 	"output format",
				"required": 	false,
				"default": 		"json", 
				"location": 	"query"  
			}
		}
	}
	return stories_list;
}

var discover_stories_create = function() {
	var	post			= {
		"id": 			"rip.stories:create",
		"path": 		"/ustories",
		"httpMethod": 	"POST",
		"description": 	"Creates a new story",
		"request": {
			"$ref":"StoryEntry"
		},
		"response": {
			"$ref":"Story"
		}
	}
	return post;
}

var discover_stories_update = function() {
	var	update			= {
		"id": 			"rip.stories:update",
		"path": 		"/ustories",
		"httpMethod": 	"PUT",
		"description": 	"Updates an existing story",
		"request": {
			"$ref":"StoryEntry"
		},
		"response": {
			"$ref":"Story"
		}
	}
	return update;	
}

var discover_stories_delete = function() {
	var	del	= {
		"id": 			"rip.stories:delete",
		"path": 		"/ustories/{id}",
		"httpMethod": 	"DELETE",
		"description": 	"Deletes an existing story",
		"parameters": {
			id: {
			"type": "integer",
			"description":"Story ID",
			"required": true,
			"location": "path"
			}
		}
	}
	return del;
}

// ==============
//-- Services
// ==============

var	discover_tests_list = function(){
	var list = {
		"id": 			"rip.tests:list",
		"path": 		"/rtests",
		"httpMethod": 	"GET",
		"description": 	"List Services",
		"parameters": {
			"fmt": {
				"type": 		"string",
				"enum": 		output_formats, 
				"description": 	"output format",
				"required": 	false,
				"default": 		"json", 
				"location": 	"query"  
			}
		}
	}
	return list;
}

var discover_tests_create = function() {
	var get = {
			"id": 			"rip.tests:post",
			"path": 		"/rtests",
			"httpMethod": 	"POST",
			"description": 	"Create Test",
			"request": {
				"$ref":"TestEntry"
			},
			"response": {
				"$ref":"Test"
			}
		}
	return get;
}

var discover_tests_delete = function() {
	var del = {
			"id": 			"rip.tests:delete",
			"path": 		"/rtests/{id}",
			"httpMethod": 	"DELETE",
			"description": 	"Delete service",
			"parameters": {
				id: {
				"type": "integer",
				"description":"Test ID",
				"required": true
				}
			}
		}
	return del;
}

var discover_tests_get = function() {
	var get = {
			"id": 			"rip.tests:get",
			"path": 		"/rtests/{id}.{fmt}",
			"httpMethod": 	"GET",
			"description": 	"Get Service",
			"parameters": {
				"id": {
					"type": 		"integer",
					"description": 	"Task id",
					"required": 	true,
					"location": 	"path"
				},
				"fmt": {
					"type": 		"string",
					"enum": 		output_formats, 
					"description": 	"output format",
					"required": 	false,
					"default": 		"json", 
					"location": 	"query"  
				},
			},
			"parametersOrder": [ "id", "fmt"],
			"response": {
				"$ref":"Story"
			}
		}
	return get;
}
	
module.exports = {
		
	stories_entry_schema:  function( ) {
		var story = {
			"id": 	"StoryEntry",
			"type": "Object",
			"properties": {
				"kind": {
					"type": "string",
					"description": "Type of the resource.  This is always 'rip#storyEntry'. ",
					"default": "rip#storyEntry",
					"required": 	true
				},
				"content": {
					"type": "string",
					"description": "User Story Content",
					"required": 	true
				}
			}
		};
		
		return story;
	},
	
	stories_list_schema: function() {
			var story = {
				"id": 	"StoriesList",
				"type": "Object",
				"properties": {
					"kind": {
						"type": "string",
						"description": "Type of the resource.  This is always 'rip#storyEntry'. ",
						"default": "rip#storyEntry",
						"required": 	true
					},
					"content": {
						"type":  		"string",
						"description": "User story content",
						"required": 	true
					},
				}
			};
			return story;
	},
	
	stories_schema: function() {
			var story = {
				"id": 	"Story",
				"type": "Object",
				"properties": {
					"kind": {
						"type": "string",
						"description": "Type of the resource.  This is always 'rip#story'. ",
						"default": "rip#story",
						"required": 	true
					},
					"content": {
						"type":  		"string",
						"description":  "User story content",
						"required": 	true
					},
					
					"links": {
						"type": "array",
						"description": "various links for that resource",
						"items": {
							$ref: "create_story_link_schema"
						}
					}
				}
			};
			return story;
	},

	tests_schema: function() {
		var tests = {
			"id": 	"Test",
			"type": "Object",
			"properties": {
				"kind": {
					"type": "string",
					"description": "Type of the resource.  This is always 'rip#Test'. ",
					"default": "rip#Test",
					"required": 	true
				},
				"id": {
					"type": "integer",
					"description": "Test ID. ",
					"required": 	true
				},
				"etag": {
					"type": "string",
					"description": "test etag for cacheability"
				},
				"links": {},
				"url": {
					"type": "string",
					"description": "Service URL that has been evaluated"
				},
				"version": {
					"type": "string",
					"description": "version number"
				},
				"options": {
					"type": "string",
					"description": "Comma delimited options used to select tests"
				},
				"stats": {
					"$ref": "rip#Stats"
				}
			}
		};
		return tests;
	},
	
	tests_entry_schema: function() {
		var te = {
			"id": 	"TestEntry",
			"type": "Object",
			"properties": {
				"kind": {
					"type": "string",
					"description": "Type of the resource.  This is always 'rip#service_entry'. ",
					"default": "rip#service_entry",
					"required": 	true
				},
				"url": {
					"type": 		"string",
					"description": 	"service url",
					"required": 	true
				}
			}
		};

		return te;
	},
	
	tests_list_schema: function() {
		var testList = {
			"id": 	"TestList",
			"type": "Object",
			"properties": {
				"kind": {
					"type": "string",
					"description": "Type of the resource.  This is always 'rip#testList'. ",
					"default": "rip#testList",
					"required": 	true
				},
				"links": {
					"$ref": "links"
				},
				"etag": {
					"type": "string",
					"description": "test etag for cacheability",
					"required": true
				},
				"updated": {
					"type": 		"datetime",
					"description": 	"start updated time in rfc339 format",
					"required": 	true
				},
				"items": {
					
				}
			}
		};

		return testList;
	},
	
	stats_schema: function() {
		var stats = {
			"id": 	"Stats",
			"type": "Object",
			"properties": {
				"suites": {
					"type": "integer",
					"description": "Number of test suites'. ",
					"required": 	true
				},
				"tests": {
					"type": 		"integer",
					"description": 	"Number of independant tests",
					"required": 	true
				},
				"passes": {
					"type": 		"integer",
					"description": 	"Number of independant tests that passed",
					"required": 	true
				},
				"pending": {
					"type": 		"integer",
					"description": 	"Number of independant tests that are pending",
					"required": 	true
				},
				"failures": {
					"type": 		"integer",
					"description": 	"Number of independant tests that failed",
					"required": 	true
				},
				"total": {
					"type": 		"integer",
					"description": 	"Total Number of independant tests",
					"required": 	true
				},
				"duration": {
					"type": 		"integer",
					"description": 	"Total duration in ms",
					"required": 	true
				},
				"start": {
					"type": 		"datetime",
					"description": 	"start time in rfc339 format",
					"required": 	true
				},
				"end": {
					"type": 		"datetime",
					"description": 	"end time in rfc339 format",
					"required": 	true
				}
			}
		};

		return stats;
	},
	current_schema: function() {
		var d = {
			"kind": 			"discovery#restDescription",
			"id":				"rip:v1",
			"name":				"RIP",
			"version":			"v1",
			"title":			"RIP Interface Protocol Evaluation and Test Service",
			"description":		"RIP let's you evaluate and test RESTful services using user stories and acceptance test criteria",
			
			"icons":			{ 'x16': server_url+"/images/RIPx16.png",
								  'x32': server_url+"/images/RIPx32.png" 
								},
			
			"documentationLink": server_url+"/docs/overview.html",
			
			"labels":			['prototype'],
			"preferred":		true,
			"protocol":			"http",
			"basePath":			"",
			
			"auth":				{ protocol: 'Openid/OAuth Hybrid' },
			
			"schemas":			{
				//"Stories": 			module.exports.stories_schema(),
				//"StoryEntry":		module.exports.stories_entry_schema(),
				//"StoryList":		module.exports.stories_list_schema(),
				
				"Test": 			module.exports.tests_schema(), 
				"TestEntry":  		module.exports.tests_entry_schema(),
				"TestsList": 	 	module.exports.tests_list_schema(),
				
				"Stats": 			module.exports.stats_schema(), 
			},			
			
			"resources":  	{
				//"Stories": {
				//	"methods": 	{
				//		"get": 		discover_stories_create(),
				//		"list": 	discover_stories_list(),
				//		"create": 	discover_stories_create(),
				//		"delete": 	discover_stories_delete()
				//	}  
				//},
				
				"Tests": {
					"methods": {
						"get": 		discover_tests_get(),
						"list":   	discover_tests_list(),
						"create": 	discover_tests_create(),
						"delete": 	discover_tests_delete()
					}
				}
			}	
		};
		return d;	
	},
	
	v1: function(req, res) {
		var d = 	module.exports.current_schema();
		res.header('Content-Type', 'application/json; charset=utf-8');		
		res.send(d);
	},
	
	// most stable service discovery document
	index: function(req, res) {
		res.redirect('/discovery/v1');			
	},
	
	// return resource properties
	resource: function(req, res) {
		var resource 	= req.param('resource');
		var schema 		= module.exports.current_schema();
		var properties 	= schema.schemas[resource];
		if( properties ) {
			res.header('Content-Type', 'application/json; charset=utf-8');		
			res.send(properties.properties);
		} else {
			console.log("Could not find schema for:"+resource);
			res.send(404);
		}
	},
	// Relax NG Compact Syntax
	rnc: function(req, res ) {
		try {
		var name  = req.params['name'];
		var file  = __dirname + "/../../public/schemas/"+name+".rnc";
		//console.log("rnc:"+file);
		var str = fs.readFileSync(file, 'utf-8');
		
		res.contentType('text');
		res.send( str, {layout:false});
		} catch(e) { 
			console.error(e);
			res.send(404) 
		}
	}
};