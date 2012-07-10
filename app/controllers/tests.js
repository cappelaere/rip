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
var host;
//var results;

var suite 		= new Suite('', new Context)
suite.timeout(2000);	// timout in milliseconds;

// we need to overload this to allow for our own reporter
mocha.prototype.reporter = function(name){
  //name = name || 'dot';
  //this._reporter = require('./reporters/' + name);
  //if (!this._reporter) throw new Error('invalid reporter "' + name + '"');
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

	var rstr="";
	var indent = 0;
	
	var self 	= this
    , stats 	= this.stats;
	
	 stats.total = runner.total;
	 stats.duration = 0;
	
	  runner.on('suite', function(suite){
		//console.log("suite %s starts", suite.fullTitle());
	    if (suite.root) return;
	    rstr += '<li class="suite">';
		var story_url = host+"?q="+utils.escapeRegexp(suite.fullTitle());
	    rstr += util.format('<h1><a href=\"%s\">%s</a></h1>', story_url,suite.title);
	    rstr += "<ul>";
		indent++;
	  });

	  runner.on('suite end', function(suite){
		indent--;
		debug("suite %s ends %d", suite.fullTitle(), indent);
	    if (suite.root) return;
	    rstr += '</ul>\n</li>';
	
		if( indent == 0 ) {
			app.sio.sockets.emit("rstats", JSON.stringify(stats) );
			debug(rstr);
			app.sio.sockets.emit("rsuite", rstr, function(data) {
				console.log("got:"+data);
			} );
			rstr = "";
		}
			
		//console.log("*** end");
	  });

	// runner.on('pass', function(test){
	//	debug("test pass");
		//stats.passes = stats.passes || 0; 
	//	stats.passes++; 
		
	//	var medium = exports.slow / 2;
	//  test.speed = test.duration > exports.slow
	//      ? 'slow'
	//      : test.duration > medium
	//        ? 'medium'
	//        : 'fast';
	
	//    results += util.format('<dt>%s</dt>', test.title);
	//    var code = utils.escape(utils.clean(test.fn.toString()));
	//    results += util.format('<dd><pre><code>%s</code></pre></dd>', code);
    //  });
	
	//  runner.on('fail', function(test, err){
	//	debug("test fail");
	    //stats.failures = stats.failures || 0;
	//    stats.failures++;
	//    test.err = err;
	//    failures.push(test);
	//  });
	 
	//  runner.on('pending', function(){
	//	debug("test pending");
	//    stats.pending++;
	//  });
	
	 runner.on('test end', function(test) {
		debug("test end:"+test.speed);

	    var pre_id = 'pre_'+stats.tests;
	
		var onclick = "onclick='ShowHidePre(\""+pre_id+"\");'";
	    
	    if ('passed' == test.state) {
	      rstr += util.format('<li class=\"test pass %s\"><h2 %s>%s<span class=\"duration\">%dms</span></h2>', 
				 test.speed, onclick, test.title, test.duration);
	    } else if (test.pending) {
	      rstr += util.format('<li class=\"test pass pending\"><h2 %s>%s</h2>', onclick, test.title);
	    } else {
	      rstr += util.format('<li class=\"test fail\"><h2 %s>%s</h2>', onclick, test.title);
	      var str = test.err.stack || test.err.toString();
	      if (!~str.indexOf(test.err.message)) {
	        str = test.err.message + '\n' + str;
	      }
		  rstr += util.format('<pre class=\"error\">%s</pre>', str);
		}
		
		if (!test.pending) {
	      rstr += util.format('<pre id=\"'+pre_id+'\" style=\"display: none;\"><code>%s</code></pre>', 
			highlight(utils.clean(test.fn.toString())));
	    }
		rstr += "</li>"
	 });
	
	runner.on('end', function(){
		debug("tests end: %j", stats);
		
		//var duration 	= (stats.duration).toFixed(2)
		//var statsTemplate = '<ul id=\"stats\">'
		//  + '<li class=\"progress\"><canvas width=\"40\" height=\"40\"></canvas></li>'
		//  + '<li class=\"passes\">passes: <em>%d</em></li>'
		//  + '<li class=\"failures\">failures: <em>%d</em></li>'
		//  + '<li class=\"duration\">duration: <em>%d</em>ms</li>'
		//  + '</ul>';
		//var statHtml = util.format(statsTemplate, stats.passes, stats.failures, duration);
		//var report = "<ul id='report'>"+results+'</ul>';
		//results = statHtml+report; 
		
		app.sio.sockets.emit("rstats", JSON.stringify(stats) );
  	}); 
}

var test_files = [
 "./public/tests/start_test.js"
, "./public/tests/EndPoint/ValidEndpoint.js"
, "./public/tests/LandingPage/LandingPage.js"
, "./public/tests/OpenSearch/OpenSearch.js"
, "./public/tests/API/GoogleDiscoveryAPI.js"
, "./public/tests/UniformInterface/UniformInterface.js"
, "./public/tests/end_test.js"
];

var always_files = {
	"start_test": 		'on',
	"ValidEndpoint": 	'on',
	"LandingPage": 		'on',
	"UniformInterface": 'on',
	"end_test": 		'on'
}

// resolve

test_files = test_files.map(function(path){
  return resolve(path);
});

module.exports = {
	index: function(req, res) {				
		res.render("tests/index.jade");					
	},
	
	test: function(req,res){
		res.render("tests/test.ejs", {layout:false});				
	},
	
	form: function(req, res) {
		res.render("tests/form.jade");		
	},
	
	// start test when web page is up and synchronized with socket.io
	start: function( params ) {
		debug("Start:"+util.inspect(params));
		
		var mt = new mocha( {
			ui: 		'bdd',
			reporter: 	RipDoc,
			globals:    ['url', "opensearch_href", "discovery_href", "discovery_doc"]
		});
		//eyes.inspect(mt);
		
		// need to pass that to tests global somehow
		global.url= params['url'];
		
		var startDate = new Date;
		for( h in always_files ) {
			params[h] = always_files[h]
		}

		try {
			selectFiles = [];
			
		  	test_files.forEach(function(file){
		    	delete require.cache[file];
				var base = path.basename(file,".js");
				if( params[base] == 'on') {
					debug("load %s", file);
					mt.addFile(file);
				}
			});
						
			mt.run( function(total) {
				var duration = new Date - startDate;
				debug("total tests duration: %d ms", duration);
			});			
	  
		} catch(e) {
			console.trace("mocha run exception:"+e);
		}			
	},
	create: function(req, res) {
		console.log("create tests params:"+util.inspect(req.body.params));
		
		websocket_url 	= "http://"+req.headers.host;
		host 			= "http://"+req.headers.host+"/ustories";

		// url endpoint to test
		var test_url	= req.body.params['url'];
		
		var start = new Date;
		res.render("tests/results.ejs", {
			layout: 	false,
			url: 		test_url,
			server_url: websocket_url,
			params: 	req.body.params });
	},
	
	show: function(req, res) {
		var id = req.params['id'];
		res.render("tests/show.jade");
	}
}