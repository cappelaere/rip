var fs			= require('fs'),
    util		= require('util');

var exports 	= module.exports;

try {
var contents 	= fs.readFileSync(__dirname + '/../config/config.yaml', 'utf-8');
} catch(e) {
	if( e.code == 'ENOENT') {
		console.log("** Error - Config file ./config/config.yaml is missing.")
		console.log("Please Customize  ./config/config.yaml.template for your application.")
	} else {
		console.log("Config File Error:"+util.inspect(e))
	}
}
var yf 		 	= JSON.parse(contents);


// Fully Qualified Host Name
exports.server_url					= yf.server_url;
exports.realm						= yf.realm;
exports.root_service				= yf.root_service;
exports.root_dir 					= yf.radarsat_root_dir;

// Twitter
exports.twitter_consumer_key 		= yf.twitter_consumer_key;
exports.twitter_consumer_secret 	= yf.twitter_consumer_secret;
exports.twitter_oauth_token 		= yf.twitter_oauth_token;
exports.twitter_oauth_secret 		= yf.twitter_oauth_secret;


// Pubsubhubbub
exports.pubsubhubbub_url			= yf.pubsubhubbub_url;

// Debug
exports.debug						= yf.debug;

// redis connection
exports.redis_conn_url				= yf.redis_conn_url;

// trackingID
exports.trackingID					= yf.trackingID;

// GoogleAPIKeyID
exports.googleAPIKey				= yf.googleAPIKey;
exports.clientID					= yf.clientID;
exports.profileID					= yf.profileID;

exports.OAuth						= yf.OAuth;