var fs			= require('fs');
var util		= require('util');
var path		= require('path');
var eyes		= require('eyes');
var async		= require('async');

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
		
		app.db.get('services:'+runner.params['url'], function(err, data) {
			if( !err ) {
				var json = JSON.parse(data)
				if( json == null ) {
					json = { 	'url': runner.params['url'],
								'passes': 0,
								'failures':0 };
				};
				
				var tweet_it = false;
				
				// no tweeting while local testing
				// no tweet if results are identical
				if( runner.params['url'] != "http://localhost") {
					// make sure there is a significant change
					if( (json.passes != stats.passes) || (json.failures != stats.failures) ) {
						tweet_it = true;
					}
				}

				var tmsg = runner.params['url'] + " - Pass:"+stats.passes+" Fail:"+stats.failures + " with:";
				for( var h in always_files ) { delete runner.params[h]; }
				delete runner.params['url'];
				delete runner.params['discovery'];
				delete runner.params['host'];
				delete runner.params['sio'];
				
				var keys = []
				for( var key in runner.params ) { keys.push(key); }
				tmsg += keys.join(", ")
				
				//console.log("tweet:"+ tmsg);
				
				if(tweet_it ) try {
					app.twit.updateStatus(tmsg, function (data) {
							//console.log("twitter:"+util.inspect(data));
					});
				} catch(e) { console.error("err:"+e+" connecting to twitter") }
				
				// save in the database
				json.stats 	= stats;
				json.date   = new Date;
				json.with   = keys.join(", ");
				json.version= app.version;
				
				app.db.sadd('services', json.url);
				app.db.set('services:'+ json.url, JSON.stringify(json));
				app.db.set('services:output:'+ json.url, output);
				
				//console.log("saved:"+util.inspect(json));
			} else {
				console.log("error on getting data for:"+url)
			}
		})
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
, "./public/tests/LandingPage/LandingPage.js"
, "./public/tests/OpenSearch/OpenSearch.js"
, "./public/tests/Discovery/GoogleDiscoveryAPI.js"
, "./public/tests/Discovery/AtompubDiscoveryAPI.js"
, "./public/tests/Discovery/GeoservicesDiscoveryAPI.js"
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
	"start_test": 			'on',
	"ValidEndpoint": 		'on',
	"LandingPage": 			'on',
	"ContentNegotiation": 	'on',
	"UniformInterface": 	'on',
	"Caching": 			 	'on',
	"HATEOAS": 				'on',
	"Compression": 			'on',
	"end_test": 			'on'
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

	var startDate = new Date;
	for( var h in always_files ) {
		params[h] = always_files[h]
	}

	debug(util.inspect(params));

	var runner;
	
	try {		
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

module.exports = {
	index: function(req, res) {				
		res.render("tests/index.jade");					
	},
	
	test: function(req,res){
		res.render("tests/test.ejs", {layout:false});				
	},
	
	// previous form with no html streaming
	old_form: function(req, res) {
		app.db.smembers('services', function(err, replies) {	
			debug("form urls:"+util.inspect(replies))
			res.render("tests/form.jade", {urls: replies});		
		})
	},

	// this is now using socket_io with streaming html
	form: function(req, res) {
		//app.db.smembers('services', function(err, replies) {	
		//	debug("form urls:"+util.inspect(replies))
		//	res.render("tests/form2.jade", {urls: replies});		
		//})
		var urls = [
			"http://radarsat.geobliki.com",
			"http://geogratis.gc.ca/api/en",
			"http://geocommons.com/",
 			"http://eo-virtual-archive4.esa.int/search/html",
			"http://geodata.epa.gov/ArcGIS/rest/services",
			"http://localhost"
		]
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
		
		res.render("tests/results_sio.ejs", {
			layout: 	false,
			url: 		test_url,
			server_url: websocket_url,
			params: 	params });
	},
	
	// Create a new test and render results on a web page
	create: function(req, res) {
		var params = req.body.params;
		debug("create tests params:"+util.inspect(params));
		
		if( req.session.user) {
			var user = User.newInstance(req.session.user);
			params['userid'] = user.id
		}
		
		var websocket_url 	= "http://"+req.headers.host;
		params['host']		= "http://"+req.headers.host+"/ustories";

		// url endpoint to test
		var test_url	= req.body.params['url'];
		
		var results 	= runTests(params, function( results) {
			
		  res.render("tests/results.ejs", {
			layout: 	false,
			url: 		test_url,
			server_url: websocket_url,
			params: 	params,
			results: 	results });
		});
	},
	
	show: function(req, res) {
		var id = req.params['id'];
		res.render("tests/show.jade");
	}
}