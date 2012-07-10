//require('long-stack-traces');

/**
 * Module dependencies.
 */

var express 		= require('express'),
	sio				= require('socket.io'),
	path			= require('path'),
	util			= require('util'),
	fs				= require('fs'),
    jade			= require('jade'),
	Encoder			= require('node-html-encoder').Encoder,
	home			= require('./app/controllers/home'),
	docs			= require('./app/controllers/docs'),
	stories			= require('./app/controllers/ustories'),
	tests			= require('./app/controllers/tests'),
	services		= require('./app/controllers/services'),
	discovery		= require('./app/controllers/discovery'),
	api				= require('./app/controllers/api'),
 	debug			= require('debug'),
	cfg				= require('./lib/config'),
	OAuthVerify		= require('./lib/oauth_verify'),
	
	//form			= require('connect-form'),
	//twitter		= require('twitter/index'),
  	RedisStore 		= require('connect-redis')(express),
 	redis			= require('redis');

	var server_url = cfg.server_url;

	var app = module.exports = express.createServer();

	global.app 			= app;
	global.server_url 	= server_url;

	var db, sessionStore;
	
	// configuring the database access & session store
	//
	if( app.settings.env == 'production') {
		console.log("Now connecting to nodejitsu redis...")
	
		// jitsu databases create redis rip2
		// jitsu databases list
		var conn_url 		= 'redis://nodejitsu:ff6691395536b4d5636a81627530830d@drum.redistogo.com:9774/';
		var rtg 			= url.parse(conn_url);
		var passwd 			= rtg.auth.split(':')[1];
		
		db				    = redis.createClient(rtg.port, rtg.hostname);
		//console.log("redis port:"+rtg.port+" hostname:"+rtg.hostname+" passwd:"+passwd);
		db.auth(passwd);

		var str = JSON.stringify(new Date());
		console.log("Trying to start at: "+str);
		db.set("last_start", str);
		db.get("last_start", function(err, data) {
			console.log("err:"+err+" last recorded start:"+data);
		})
		
		// setting up the session store
		var options = {
			"host": rtg.hostname,
			"port": rtg.port,
			"pass": passwd
		}
		sessionStore 	= new RedisStore(options);
		
	} else {
		console.log("Connecting to localhost redis...");
		db			 = redis.createClient();
		sessionStore = new RedisStore();		
	}

	db.debugMode 	= true; 
	db.on("error", function (err) {
	    console.log("Redis Database Error " + err);
	});

	
app.root 			= process.cwd();
app.db				= db;
app.sessionStore	= sessionStore;

// we need to configure environment
console.log(util.inspect(app.settings));

var mainEnv 	= app.root + '/config/environment'+'.js';
var supportEnv 	= app.root + '/config/environments/' + app.settings.env+'.js';
require(mainEnv)
require(supportEnv)

// Access Control Function
function restrict(req, res, next) {
  if (req.session.user) {
    console.log("restrict but passed!");
    next();
  } else {
    console.log("restrict failed!");
    req.session.error 	= 'Access denied!';
	var redirect_to		= '/radarsat/session/login?requested_url='+req.url;
	console.log("unauthorized! redirect to:"+redirect_to);
    res.redirect(redirect_to, 302);
  }
}

function SendOAuthUnAuthorizedResponse( res ) {
	var headers = {
		'Status': 			"Unauthorized",
		'WWW-Authenticate': "OAuth realm='/radarsat'"
	}
    res.send("Unauthorized", headers, 401);
}

// Access Control Function
function oauth_restrict(req, res, next) {
  // check headers to see if we are a user or a process
  var oauth_headers = req.headers['authorization'];
  console.log("oauth restrict...");

  if( oauth_headers == undefined ) {
	return restrict(req, res, next);
  }

  console.log("User not set... checking oauth...");

  var oauth = new OAuthVerify;
  try {
	oauth.check(req, res, function(err) {
		if( err ) {
			console.log("Caught oauth_check err:"+err);
			SendOAuthUnAuthorizedResponse(res);
		} else {
			next();
		}
	});
  } catch(err) {
	console.log("Caught oauth_check err:"+err);
	SendOAuthUnAuthorizedResponse(res);
  }
}

// Let's look at that later
// app.helpers = require( app.root+'/app/helpers');

app.helpers({	
})

require('./mvc').boot(app);

// =========================================
// ROUTING
//

// Home page -> app
app.get('/', 											home.index);
app.get('/home', 										home.index);

// Documentations
app.get('/docs/:page.:format',							docs.index);
app.get('/docs',										docs.index);

// Google Discovery API
app.get('/discovery/v1',								discovery.v1)
app.get('/discovery',									discovery.index);

// Play with API
app.get('/api',											api.index);

// Features
app.get('/ustories',									stories.index);
app.get('/ustories/:cat/:id',							stories.show);
app.get('/ustories/:cat/:id/:id2',						stories.show);

// Tests
app.get('/tests',										tests.index);
app.post('/tests',										tests.create);
app.get('/tests/form',									tests.form);
app.get('/tests/test',									tests.test);
app.get('/tests/:id',									tests.show);

// Services
app.get('/services',									services.index);
app.get('/services/form',								services.form);
app.get('/services/:id',								services.show);

// Process the API request
app.post('/processReq',api.oauth, api.processRequest, function(req, res) {
    var result = {
        headers: req.resultHeaders,
        response: req.result,
        call: req.call
    };

    res.send(result);
});


// ==========================================
// Startup
//
//app.twit = new twitter({
//	consumer_key: 			cfg.twitter_consumer_key,
//	consumer_secret: 		cfg.twitter_consumer_secret,
//	access_token_key: 		cfg.twitter_oauth_token,
//	access_token_secret: 	cfg.twitter_oauth_secret
//});

//app.twit.updateStatus('Radarsat Server started - ' + new Date(),
//	function (data) {
//		console.log(util.inspect(data));
//	}
//);

// port set based on NODE_ENV settings (production, development or test)
//console.log(util.inspect(process.env));

var port = process.env.PORT || app_port;

if( app.settings.env == 'development') {
	server_url = "http://localhost:"+port;
}

console.log(server_url + " trying to start...");

if (!module.parent) {
	app.listen(port);
	console.log('RIP started on port:'+port);
	
	// Attach socket.io
	app.sio = sio.listen(app);

	app.sio.sockets.on('connection', function (socket) {
		debug("socket.io on");
		
		// send connected message to browser
		socket.emit('connected');
		
		socket.on('disconnect', function () {
			debug("socket.io disconnected");
		});
		
		// receive startTest from Browser and start tests
		socket.on('startTest', function (data) {
			var encoder = new Encoder('entity');
			var params = JSON.parse(encoder.htmlDecode(data))
			//console.log("please start tests:"+ util.inspect(params));
			tests.start(params);
		});
	});
	
	// Configure it
	app.sio.configure('production', function() {
		app.sio.enable('browser client minification');  // send minified client
		app.sio.enable('browser client etag');          // apply etag caching logic based on version number
		app.sio.enable('browser client gzip');          // gzip the file
		app.sio.set('log level', 1);                    // reduce logging
		app.sio.set('transports', [                     // enable all transports (optional if you want flashsocket)
		    'websocket'
		  , 'flashsocket'
		  , 'htmlfile'
		  , 'xhr-polling'
		  , 'jsonp-polling'
		]);
	})

	app.sio.configure('development', function() {
		app.sio.set('log level', 1);
	})	
}