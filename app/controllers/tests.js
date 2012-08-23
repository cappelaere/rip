var fs			= require('fs');
var util		= require('util');
var path		= require('path');
var eyes		= require('eyes');
var async		= require('async');

var Test		= require('../models/test.js');

var resolve 	= path.resolve;
var mocha		= require('mocha');
var Suite 		= mocha.Suite;
var Context 	= mocha.Context

var Base		= require('mocha/lib/reporters/base');
var utils		= require('mocha/lib/utils');
var http		= require('http');
var urllib		= require("url");
var chai		= require("chai");
var expect		= chai.expect;

var debug 		= require('debug')('tests');

// we need to overload this to allow for our own reporter
mocha.prototype.reporter = function(name){
  this._reporter = name;
  return this;
};

function highlight(js) {
	return js
	.replace(/\t/g, '  ')
  	.replace(/</g, '&lt;')
  	.replace(/>/g, '&gt;')
  	.replace(/\/\/(.*)/gm, '<span class="comment">//$1</span>')
  	.replace(/('.*?')/gm, '<span class="string">$1</span>')
  	.replace(/(\d+\.\d+)/gm, '<span class="number">$1</span>')
  	.replace(/(\d+)/gm, '<span class="number">$1</span>')
  	.replace(/\bnew *(\w+)/gm, '<span class="keyword">new</span> <span class="init">$1</span>')
  	.replace(/\b(function|new|throw|return|var|if|else)\b/gm, '<span class="keyword">$1</span>')
}

// ==============================
// RipDoc Reporter
//
function RipDoc(runner) {
	Base.call(this, runner);

	var results		= "";
	var indent 		= 0;	// used for socket.io to emit complete/valid html rather than partial
	var output		= "";
	
	var self 		= this
    , stats 		= this.stats;
	
	stats.total 	= runner.total;
	stats.duration 	= 0;
	
	runner.on('suite', function(suite) {
		debug("suite %s starts", suite.fullTitle());
	    if (suite.root) return;
	    results += '<li class="suite">';
		var story_url = runner.params['host']+"?q="+utils.escapeRegexp(suite.fullTitle());
	    results += util.format('<h1><a href=\"%s\">%s</a></h1>', story_url,suite.title);
	    results += "<ul>";	
		indent++;
	});

	runner.on('suite end', function(suite){
		indent--;
		//console.log("suite %s ends %d", suite.fullTitle(), indent);
	    if (suite.root) return;
	    results += '</ul>\n</li>';
	
		if( runner.params['sio'] && indent == 0 ) {
			app.sio.sockets.emit("rstats", JSON.stringify(stats) );
			app.sio.sockets.emit("rsuite", results, function(data) {
				debug("got:"+data);
			} );
			output += results;
			results = "";
		}
	});
	
	runner.on('test end', function(test) {
		debug("test end:"+test.speed);
		
	    var pre_id = 'pre_'+stats.tests;
	
		var onclick = "onclick='ShowHidePre(\""+pre_id+"\");'";
	    
	    if ('passed' == test.state) {
	      results += util.format('<li class=\"test pass %s\"><h2 %s>%s<span class=\"duration\">%dms</span></h2>', 
				 test.speed, onclick, test.title, test.duration);
	    } else if (test.pending) {
	      results += util.format('<li class=\"test pass pending\"><h2 %s>%s</h2>', onclick, test.title);
	    } else {
	      results += util.format('<li class=\"test fail\"><h2 %s>%s</h2>', onclick, test.title);
	      var str = test.err.stack || test.err.toString();
	      if (!~str.indexOf(test.err.message)) {
	        str = test.err.message + '\n' + str;
	      }
		  results += util.format('<pre class=\"error\">%s</pre>', str);
		}
		
		if (!test.pending) {
	      results += util.format('<pre id=\"'+pre_id+'\" style=\"display: none;\"><code>%s</code></pre>', 
			highlight(utils.clean(test.fn.toString())));
	    }
		results += "</li>"
	});
	
	runner.on('end', function(){
		debug("tests url:"+runner.params['url']+" end: %j", stats);
			
		var tweet_it = false;
		
		// no tweeting while local testing
		// no tweet if results are identical
		if( runner.params['url'] != "http://localhost") {
			// make sure there is a significant change
			//if( (json.passes != stats.passes) || (json.failures != stats.failures) ) {
				tweet_it = true;
			//}
		}

		var tmsg = runner.params['url'] + " - Pass:"+stats.passes+" Fail:"+stats.failures + " with:";
		
		var url		  = params['url'];
		var RMM_Level = params['RMM_Level'];
		var key = 'level'+RMM_Level;
		for( var h in always_files[key] ) { 
			delete runner.params[h]; 
		}
		
		delete runner.params['url'];
		delete runner.params['discovery'];
		delete runner.params['host'];
		delete runner.params['sio'];
		
		delete runner.params['RMM_Level'];
		
		var keys = []
		for( var key in runner.params ) { keys.push(key); }
		tmsg += keys.join(", ")
		
		if( RMM_Level)
			tmsg += "@ RMM Level:"+RMM_Level;
				
		if(tweet_it ) try {
			app.twit.updateStatus(tmsg, function (data) {});
		} catch(e) { console.error("err:"+e+" connecting to twitter") }
		
		var options = keys.join(",");
		var test = new Test(params['userid'], url, stats, options, RMM_Level, app.version, output )
		test.save();
			
		var duration 		= (stats.duration).toFixed(2)
		var statsTemplate 	= '<ul id=\"stats\">'
		  + '<li class=\"progress\"><canvas width=\"40\" height=\"40\"></canvas></li>'
		  + '<li class=\"passes\">passes: <em>%d</em></li>'
		  + '<li class=\"failures\">failures: <em>%d</em></li>'
		  + '<li class=\"duration\">duration: <em>%d</em>ms</li>'
		  + '</ul>';
		var statHtml 	= util.format(statsTemplate, stats.passes, stats.failures, duration);
		var report 		= "<ul id='report'>"+results+'</ul>';
		
		runner.results = statHtml+report;
		
		if( runner.params['sio'] ) app.sio.sockets.emit("rstats", JSON.stringify(stats) );
  	}); 
}

RipDoc.prototype.getResults = function(){
	return this.results;
}

// explicit list to force order
var test_files = [
 "./public/tests/start_test.js"
, "./public/tests/EndPoint/ValidEndpoint.js"
, "./public/tests/LandingPage/LandingPage0.js"
, "./public/tests/LandingPage/LandingPage3.js"
, "./public/tests/OpenSearch/OpenSearch.js"
, "./public/tests/Discovery/GoogleDiscoveryAPI.js"
, "./public/tests/Discovery/AtompubDiscoveryAPI.js"
, "./public/tests/Discovery/GeoservicesDiscoveryAPI.js"
, "./public/tests/Discovery/GetCapabilities.js"
, "./public/tests/Discovery/NoDiscovery.js"
, "./public/tests/Discovery/ODataDiscoveryAPI.js"
, "./public/tests/ContentNegotiation/ContentNegotiation.js"
, "./public/tests/ContentNegotiation/Headers.js"
, "./public/tests/ContentNegotiation/Suffixes.js"
, "./public/tests/ContentNegotiation/MimeTypes.js"
, "./public/tests/UniformInterface/UniformInterface.js"
, "./public/tests/Atom/Atom.js"
, "./public/tests/Caching/Caching.js"
, "./public/tests/Compression/Compression.js"
, "./public/tests/HATEOAS/HATEOAS.js"
, "./public/tests/HATEOAS/HAL.js"
, "./public/tests/HATEOAS/Siren.js"
, "./public/tests/end_test.js"
];

var always_files = {
	"level0": {
		"start_test": 			'on',
		"ValidEndpoint": 		'on',
		"LandingPage0": 		'on',
		"end_test": 			'on'
	},
	"level1": {
		"start_test": 			'on',
		"ValidEndpoint": 		'on',
		"LandingPage0": 		'on',
		"end_test": 			'on'
	},
	"level2": {
		"start_test": 			'on',
		"ValidEndpoint": 		'on',
		"LandingPage0": 		'on',
		"end_test": 			'on'
	},
	"level3": {
		"start_test": 			'on',
		"ValidEndpoint": 		'on',
		"LandingPage3": 		'on',
		"ContentNegotiation": 	'on',
		"UniformInterface": 	'on',
		"Caching": 			 	'on',
		"HATEOAS": 				'on',
		"Compression": 			'on',
		"end_test": 			'on'
	}
}

// resolve

test_files = test_files.map(function(path){
  return resolve(path);
});

// start test when web page is up and synchronized with socket.io
function runTests( params, fn ) {
	debug("Start:"+util.inspect(params));
	
	var mt = new mocha( {
		ui: 		'bdd',
		reporter: 	RipDoc,
		globals:    [ 	'discovery_href', 
						'discovery_doc', 
						'docs_href', 
						'explorer_href', 
						'opensearch_href', 
						'r',					//TODO global leakage somwhere grrr!
						'resources_urls',
						'results',
						'service_doc', 
						'url',
						'params',
						'$'
					],
		timeout: 	5000
	});
	//console.log("mt:"+util.inspect(mt));
	
	// need to pass that to tests global somehow
	global.url				= params['url'];	
	global.params 			= params;
	global.discovery_href 	= undefined;
	global.discovery_doc 	= undefined;
	global.opensearch_href 	= undefined;
	global.resources_urls 	= [];
	global.results 			= "";
	global.service_doc 		= undefined;

	var rmm_level 			= params['RMM_Level'] || 0;
	var key 				= 'level'+rmm_level;
	debug("rmm_level:"+rmm_level);
	
	var startDate = new Date;
	for( var h in always_files[key] ) {
		params[h] = always_files[key][h]
	}

	debug(util.inspect(params));

	var runner;
	
	try {		
		// Look at security if enabled
		if( params['security'] ) {
			console.log("Can we access url:"+params['url'] + " " + params['security'] )
		} 
		
		// fix discovery option
		var discovery = params['discovery'];
		params[discovery] = 'on';
		delete discovery;
		
	  	test_files.forEach(function(file){
	    	delete require.cache[file];
			var base = path.basename(file,".js");
			if( params[base] == 'on') {
				debug("loading %s", file);
				mt.addFile(file);
			} else {
				debug("base:"+base+" off");
			}
		});
					
		runner = mt.run( function(total) {
			fn( runner.results );
		});	
		
		runner.params = params;
						
	} catch(e) {
		console.trace("mocha run exception:"+e);
	}			
}

var urls = [
	"http://radarsat.geobliki.com",
	"http://geogratis.gc.ca/api/en",
	"http://geocommons.com/",
	"http://eo-virtual-archive4.esa.int/search/html",
	"http://geodata.epa.gov/ArcGIS/rest/services",
	"http://localhost"
]

module.exports = {
	index: function(req, res) {	
		server_url  = "http://"+req.headers.host;
		var q   	= req.query['q'];
		var page	= req.query['page'];
		var limit	= req.query['limit'];
	
		var fmt		= req.fmt();

		if( limit == undefined ) limit = 25;
		if( page == undefined )  page  = 1;

		var end 	= page*limit -1;
		var start 	= (page-1)*limit;

		var startIndex = (parseInt(page)-1)*parseInt(limit);

		var if_none_match = req.headers["if-none-match"];
		var last_modified = req.headers["last-modified"];
		
		switch( fmt ) {
			case 'atom':
			case 'json':
				function render_atom_or_json(list, req, res ) {
					var updated = "";
					for( el in list ) {
						if( updated < list[el].stats.end) updated = list[el].stats.end;
						list[el].options = list[el].options.replace(/,/g, ", ")
					}
					var testList = {
						'kind': "rip#testList",
						'links': {
							'self': {
								'href': "/rtests.json",
								'type': "application/json",
								'describedBy': server_url+"/discovery/TestsList.properties"
							},
							'create': {
								'href': "/rtests",
								'method': 'POST'
							}
						},
						"updated": updated,
						
						'items': list
					}
					testList['etag'] 	=  JSON.stringify(testList).sha1_hex();
					
					if( fmt == 'json') {
						var content_type 	= 'application/json; profile=\"'+server_url+"/discovery/TestList.properties\"";
				
						app.check_headers(req, res, testList.etag, testList.updated, content_type, function() {
							return res.send(testList);
						});
						
					} else { // atom
						for( el in list ) {
							var e = list[el];
							e.link 			= "http://"+req.headers.host+"/rtests/"+e.id;
							var score 		= e.stats.passes-e.stats.failures;
							var description = "<table>"
							description 	+= "<tr><td>URL:</td><td>"+e.url + "</td></tr>"; 
							description 	+= "<tr><td>Level:</td><td>"+e.level+"</td></tr>"
							description 	+= "<tr><td>Options:</td><td>"+e.options+"</td></tr>"
							description 	+= "<tr><td>Score:</td><td>"+ score +"</td></tr>"
							description 	+= "<tr><td>Passes:</td><td>"+e.stats.passes+"</td></tr>"
							description 	+= "<tr><td>Fails:</td><td>"+e.stats.failures+"</td></tr>"
							description 	+= "<tr><td>More Details:</td><td><a href='"+server_url+"/rtests/"+e.id+"/results'>here</a></td></tr>"
							description 	+= "</table>"
							e.description   = description.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");	
						}
						
						var totalResults 	= list.length;
						var link 			= "http://"+req.headers.host + "/rtests";
					
						content_type = "application/atom+xml; charset=utf-8";
						app.check_headers(req, res, testList.etag, testList.updated, content_type, function() {
							return res.render("tests/feed.ejs", {
								tests: 			testList.items,
								last_updated: 	updated,
								link: 			link,
								totalResults: 	totalResults,
								startIndex: 	start,
								itemsPerPage: 	end,
								layout: 		false,
								etag: 			testList.etag });
						});
					}					
				}
				
				Test.get_all_tests( function(err, list) {
					if( q ) {
						async.filter(list, function(l, cb) {
							if( l.url.indexOf(q) > 0 ) {
								cb(true)
							} else {
								cb(false)
							}
						}, function(results) {
							render_atom_or_json( results, req, res )
						})
					} else {
						render_atom_or_json( list, req, res )
					}
				});
				return;
			
			// HTML output
			default:
				function render_html( list, req, res ) {
					//eyes.inspect(list);					
					var etag = JSON.stringify(list).sha1_hex();
					var updated = "";
					for( el in list ) {
						if( list[el].latest &&  updated < list[el].latest.stats.end) updated = list[el].latest.stats.end;
					}
					
					app.check_headers(req, res, etag, updated, "text/html", function() {
						return res.render("tests/index.jade", {list: list});
					})
				}
				
				Test.get_latest_tests_for_each_service( function(err, list) {
					if( q ) {
						async.filter(list, function(l, cb) {
							if( l.latest.url.indexOf(q) > 0 ) {
								cb(true)
							} else {
								cb(false)
							}
						}, function(results) {
							render_html( results, req, res )
						})
					} else {
						render_html( list, req, res )
					}
					
				});								
		}
	},
	
	test: function(req,res){
		res.render("tests/test.ejs", {layout:false});				
	},

	levels: function(req, res) {
		var level = req.param('id');
		
		if( level  ) {
			res.render("tests/level"+level+".jade",   {urls: urls});		
		} else {
			res.render("tests/levels.jade", {urls: urls});					
		}
	},
	
	// this is now using socket_io with streaming html
	form: function(req, res) {
		res.render("tests/form2.jade", {urls: urls});		
	},
	
	sio_start: function(params, sio) {
		params['sio'] = true;
		runTests(params, function( results) {
		});
	},
	
	// This is going to start the tests and stream results to the page in realtime
	// using socket_io
	sio: function(req, res ) {
		var params = req.body.params;
		debug("sio tests params:"+util.inspect(params));
		
		var websocket_url 	= "http://"+req.headers.host;
		params['host']		= "http://"+req.headers.host+"/ustories";

		// url endpoint to test
		var test_url	= req.body.params['url'];
		
		if( params['security']) {
			console.log("try to authenticate with submitted endpoint");
			req.authenticate([params['security']], function(error, authenticated) {
				if( error ) {
					return res.send("Authentication error:"+error);
				} else {
					console.log("Authenticating...");
					return;
				}
			})
		} else {
			res.render("tests/results_sio.ejs", {
				layout: 		false,
				url: 			test_url,
				websocket_url: 	websocket_url,
				params: 		params });
		}
	},
	
	// Create a new test and render results on a web page
	create: function(req, res) {
		var params = req.body.params;
		debug("create tests params:"+util.inspect(params));
		
		if( req.session.user) {
			var user = User.newInstance(req.session.user);
			params['userid'] = user.id
		} else {
			params['userid'] = -1;
		}
		
		var websocket_url 	= "http://"+req.headers.host;
		params['host']		= "http://"+req.headers.host+"/ustories";

		// url endpoint to test
		var test_url		= req.body.params['url'];
		
		var results 		= runTests(params, function( results) {
			
		  res.render("tests/results.ejs", {
			layout: 		false,
			url: 			test_url,
			websocket_url: 	websocket_url,
			params: 		params,
			results: 		results });
		});
	},
	
	// Show a particular test
	show: function(req, res) {
		var id 		= req.params['id'];
		var fmt		= req.fmt();

		var if_none_match = req.headers["if-none-match"];
		var last_modified = req.headers["last-modified"];
		
		if( !fmt ) return res.send(406);
		
		server_url = "http://"+req.headers.host;
				
		Test.get_by_id(id, function(err, test) {
			if( !err && test) {
					var json 			=  test.media_json();
					var content_type 	= 'application/json; profile=\"'+server_url+"/discovery/Test.properties\"";
					var updated 		= test.stats.end;

					if( fmt == 'json') {
						app.check_headers(req, res, etag, updated, content_type, function() {
							return res.send(json);
						});
					} else {
						res.redirect("/rtests/"+id+"/results");
					}
			} else {
				res.send(404)
			}
		})
	},
	
	// Returns a detailed test result
	results: function(req, res) {
		var if_none_match = req.headers["if-none-match"];
		var last_modified = req.headers["last-modified"];

		var id 		= req.params['id'];
		Test.get_by_id(id, function(err, test) {
			if( !err ) {
				var etag	= JSON.stringify(test).sha1_hex();
				var updated = test.stats.end;
				
				app.check_headers(req, res, etag, updated, "text/html", function() {
					// we need to get the actual output
					app.db.get(details_instance+id, function(err, output) {
						res.render("tests/results.jade", { 	url: 	test.url, 
														results: 	output,
														json: 		test,
														layout: 	false })
					});					
				});
			  	
			} else {
				res.send(404)
			}
		})
		
	},
	
	// Returns a test history of a particular service url
	history: function(req, res) {
		var url 			= req.param('url');
		var if_none_match 	= req.headers["if-none-match"];
		var last_modified 	= req.headers["last-modified"];

		Test.get_all_tests_for_service(url, function(err, list) {
			var etag = JSON.stringify(list).sha1_hex();
			var updated = "";
			
			for( el in list ) {
				if( list[el] == null ) {
					delete list[el]
				} else if( updated < list[el].stats.end) {
					updated = list[el].stats.end;
				}
			}
			eyes.inspect(list);
			if( !err ) {
				app.check_headers(req, res, etag, updated, "text/html", function() {
					res.render("tests/history.jade", { 	url: url, list: list })
				});
			} else {
				res.send(404)
			}
		})
	},
	
	// Destroy a particular test run
	destroy: function(req, res) {
		var id 		= req.params['id'];
		console.log("tests controller destroy id:"+id)
		Test.get_by_id(id, function(err, test) {
			if( err ) return res.send(404);
			var url = test.url;
			console.log("tests controller destroy test url:"+url);
			test.destroy();
			res.redirect("/rtests/history?url="+url);
		})
	}
}