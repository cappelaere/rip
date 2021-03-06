//require('long-stack-traces');

/**
 * Module dependencies.
 */

var express 		= require('express'),
	sio				= require('socket.io'),
	path			= require('path'),
	util			= require('util'),
	url 			= require('url'),
	fs				= require('fs'),
    jade			= require('jade'),
	Encoder			= require('node-html-encoder').Encoder,
	home			= require('./app/controllers/home'),
	docs			= require('./app/controllers/docs'),
	stories			= require('./app/controllers/ustories'),
	tests			= require('./app/controllers/tests'),
	services		= require('./app/controllers/services'),
	discovery		= require('./app/controllers/discovery'),
	session			= require('./app/controllers/session'),
	api				= require('./app/controllers/api'),
	analytics		= require('./app/controllers/analytics'),
	opensearch		= require('./app/controllers/opensearch'),
	
	auth			= require('connect-auth/lib/index');
	
	//tweets			= require('./app/controllers/tweets'),
 	
	debug			= require('debug'),
	cfg				= require('./lib/config'),
	OAuthVerify		= require('./lib/oauth_verify'),
	
	//form			= require('connect-form'),
	twitter			= require('twitter'),
  	RedisStore 		= require('connect-redis')(express),
 	redis			= require('redis');

	var server_url 		= cfg.server_url;

	global.app 			= module.exports = express.createServer();

	global.server_url 	= server_url;
	global.trackingID   = cfg.trackingID;
	global.clientID 	= cfg.clientID;
	global.googleAPIKey = cfg.googleAPIKey;
	global.table_id 	= "ga:"+cfg.profileID;
	
	var db, sessionStore;
	var rtg, passwd;
	
	console.log("app.settings.env:"+util.inspect(app.settings.env))
	console.log("process.env.NODE_ENV:"+util.inspect(process.env.NODE_ENV))
	
	// configuring the database access & session store
	//
	if( app.settings.env == 'production') {

		console.log("* Connecting to redis:"+cfg.redis_conn_url)
	
		// jitsu databases create redis rip2
		// jitsu databases list and update config.yaml
		// var conn_url = 'redis://nodejitsu:ff6691395536b4d5636a81627530830d@drum.redistogo.com:9774/';
		rtg 				= url.parse(cfg.redis_conn_url);
		passwd 				= rtg.auth.split(':')[1];
		
		db				    = redis.createClient(rtg.port, rtg.hostname);
		//console.log("redis port:"+rtg.port+" hostname:"+rtg.hostname+" passwd:"+passwd);
		db.auth(passwd);
		db.debugMode 	= true; 
		db.on("error", function (err) {
		    console.log("Production Redis Database Error " + err);
		});

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
		console.log("* Connecting to localhost redis...");
		db			 = redis.createClient();
		db.on("error", function (err) {
		    console.log("Local Redis Database Error " + err);
		});
		sessionStore = new RedisStore();	
	}
	
app.root 			= process.cwd();
app.db				= db;
app.sessionStore	= sessionStore;

// we need to configure environment
console.log(util.inspect(app.settings));


var auth_middleware= function() {
  return function(req, res, next) {
	console.log("*** auth_middleware");
	
    var urlp= url.parse(req.originalUrl, true)
    if( urlp.query.login_with ) {
      req.authenticate([urlp.query.login_with], function(error, authenticated) {
        if( error ) {
          // Something has gone awry, behave as you wish.
          console.log( error );
          res.end();
      }
      else {
          if( authenticated === undefined ) {
            // The authentication strategy requires some more browser interaction, suggest you do nothing here!
          }
          else {
            // We've either failed to authenticate, or succeeded (req.isAuthenticated() will confirm, as will the value of the received argument)
            next();
          }
      }});
    }
    else {
      next();
    }
  }
};

var base_url = "http://rip.jit.su";

// weave security strategies here
app.use(auth( {
		strategies:[ 
			auth.Facebook({
				appId : 		cfg.OAuth.Facebook.key, 
				appSecret: 		cfg.OAuth.Facebook.secret, 
				scope: 			"email", 
				callback: 		base_url + cfg.OAuth.Facebook.callback})
     		, auth.Github({
				appId : 		cfg.OAuth.Github.key, 
				appSecret: 		cfg.OAuth.Github.secret, 
				callback: 		base_url + cfg.OAuth.Github.callback})
     		, auth.Google2({
				appId : 		cfg.OAuth.Google.key, 
				appSecret: 		cfg.OAuth.Google.secret, 
				callback: 		base_url + cfg.OAuth.Google.callback, requestEmailPermission: true})
     		, auth.Foursquare({
				appId: 			cfg.OAuth.Foursquare.key, 
				appSecret: 		cfg.OAuth.Foursquare.secret, 
				callback: 		base_url + cfg.OAuth.Foursquare.callback })
			],
	 	trace: true, 
		} )
	);

//app.use(auth_middleware());

var mainEnv 		= app.root + '/config/environment'+'.js';
var supportEnv 		= app.root + '/config/environments/' + app.settings.env+'.js';
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
	var redirect_to		= '/session/login?requested_url='+req.url;
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
app.get('/rip', 										home.index);
app.get('/about', 										home.about);

// Documentations
app.get('/docs/:page.:format',							docs.index);
app.get('/docs',										docs.index);

// Google Discovery API
app.get('/discovery/v1',								discovery.v1)
app.get('/discovery',									discovery.index);
app.get('/rip.json',									discovery.index);
app.get('/discovery/:resource.properties',				discovery.resource);
app.get('/discovery/:resource.rnc',						discovery.rnc);

// Play with API
app.get('/api',											api.index);

app.get('/analytics',									analytics.index);
//app.get('/tweets',										tweets.index);

// Features
app.get('/ustories',									stories.index);
app.get('/ustories.:format?',							stories.index);
app.get('/ustories/:cat/:id',							stories.show);
app.get('/ustories/:cat/:id/:id2',						stories.show);

// Tests
app.get('/rtests.:format?',								tests.index);
app.post('/rtests',										tests.create);
app.post('/rtests/sio',									tests.sio);
app.get('/rtests/old_form',								tests.old_form);
app.get('/rtests/form',									tests.form);
app.get('/rtests/levels',								tests.levels);
app.get('/rtests/levels/:id',							tests.levels);
app.get('/rtests/test',									tests.test);
app.get('/rtests/history',								tests.history);
app.get('/rtests/:id/results',							tests.results);
app.get('/rtests/:id/destroy',							tests.destroy);
app.get('/rtests/:id.:fmt?',							tests.show);

// Services
app.get('/services.:format?',							services.index);
app.get('/services/form',								restrict, services.form);
app.post('/services/create',							services.create);
app.get('/services/destroy',							services.destroy);
app.get('/services/results',							services.results);
app.get('/services/:id',								services.level);

app.get('/session/check', 								session.check);
app.get('/session/login', 								session.login);
app.get('/session/logout', 								session.logout);
app.get('/session/open_id_complete', 					session.open_id_complete);
app.get('/session', 									session.index);

app.get('/rip/session/check', 							session.check);
app.get('/rip/session/login', 							session.login);
app.get('/rip/session/logout', 							session.logout);
app.get('/rip/session/open_id_complete', 				session.open_id_complete);
app.get('/rip/session', 								session.index);

// Opensearch
app.get('/opensearch/:id', 							opensearch.index);

// Process the API request
app.post('/processReq',api.oauth, api.processRequest, function(req, res) {
    var result = {
        headers: req.resultHeaders,
        response: req.result,
        call: req.call
    };

    res.send(result);
});

// ==============================================================
// Check incoming headers and sot outgoing headers appropriately
// mich return a 304 as necessary
app.check_headers = function( req, res, etag, updated, content_type, fn ) {
	
	if( app.settings.env == 'production') {
		var if_none_match = req.headers["if-none-match"];
		var last_modified = req.headers["last-modified"];

		if( if_none_match && if_none_match==etag ) {
			debug("304 due to etag match")
			return res.send(304);
		}

		if( last_modified && last_modified==updated) {
			debug("304 due to date match")
			return res.send(304);
		}
	
		res.header('Last-Modified',updated);
		res.header('ETag', etag);
	}
	
	res.header('Content-Type',content_type);
	
	fn();
}

// ==========================================
// Startup
//
app.twit = new twitter({
	consumer_key: 			cfg.twitter_consumer_key,
	consumer_secret: 		cfg.twitter_consumer_secret,
	access_token_key: 		cfg.twitter_oauth_token,
	access_token_secret: 	cfg.twitter_oauth_secret
});

var json_package 	= JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf-8'));
app.version  		= json_package['version'];

if( app.settings.env != 'development') {
	app.twit.updateStatus('RIP REST Tester version:'+app.version+' started...',
		function (data) {
			console.log("Twitter resp:"+ util.inspect(data));
		}
	);
}

// port set based on NODE_ENV settings (production, development or test)
//console.log(util.inspect(process.env));

var port = process.env.PORT || app_port;

if( app.settings.env == 'development') {
	server_url = "http://localhost:"+port;
}

console.log(server_url + " trying to start...version:"+app.version);

var USE_SOCKET_IO = true;

if (!module.parent) {
	app.listen(port);
	console.log('RIP started on port:'+port);
	
	//===============================================================================
	if( USE_SOCKET_IO ) {	
		
		// redis clients
		var pub, sub, cli;
		
		// Attach socket.io
		app.sio = sio.listen(app);

		app.sio.sockets.on('connection', function (socket) {
			debug("socket.io on");
		
			// send connected message to browser
			socket.emit('connected');
		
			socket.on('disconnect', function () {
				debug("socket.io disconnected");
				if( pub ) pub.quit();
				if( sub ) sub.quit();
				if( cli) cli.quit();
			});
		
			// receive startTest from Browser and start tests
			socket.on('startTest', function (data) {
				var encoder = new Encoder('entity');
				var params = JSON.parse(encoder.htmlDecode(data))
				tests.sio_start(params, true);
			});
		});
	
		// Configure it
		app.sio.configure('production', function() {
			
			console.log("++ Socket.io production settings... RedisStore at:"+rtg.hostname+":"+rtg.port);
	
			var sioredis = require('socket.io/node_modules/redis');
			pub = sioredis.createClient(rtg.port, rtg.hostname);
			pub.on("error", function (err) { console.log("Socket.io pub Redis Database Error " + err); });
			pub.auth(passwd, function() { console.log("pub auth")});
	
			sub = sioredis.createClient(rtg.port, rtg.hostname);
			sub.on("error", function (err) { console.log("Socket.io sub Redis Database Error " + err);});
			sub.auth(passwd, function() { console.log("sub auth")});
	
			cli = sioredis.createClient(rtg.port, rtg.hostname);
			cli.on("error", function (err) {  console.log("Socket.io cli Redis Database Error " + err);	});
			cli.auth(passwd, function() { console.log("cli auth")});
	
			var SIORedisStore = require('socket.io/lib/stores/redis');
			app.sio.set('store', new SIORedisStore({
				redisPub: 		pub,
				redisSub: 		sub,
				redisClient: 	cli
			}));			
		
			app.sio.enable('browser client minification');  // send minified client
			app.sio.enable('browser client etag');          // apply etag caching logic based on version number
			app.sio.enable('browser client gzip');          // gzip the file
			app.sio.set('log level', 1);                    // reduce logging
			app.sio.set('transports', [                     // enable all transports (optional if you want flashsocket)
			    'websocket'
//			  , 'flashsocket'
			  , 'htmlfile'
			  , 'xhr-polling'
			  , 'jsonp-polling'
			]);
			app.sio.set("polling duration", 10);
		})

		app.sio.configure('development', function() {
			console.log("Socket.io development settings");
		
			app.sio.set('log level', 1);
		})	
	} 	// end of socketio implementation
		// ==========================================
	
	
	console.log("RIP Server ready...at:"+server_url)
}
