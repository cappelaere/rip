var fs			= require('fs');

var exports 	= module.exports;

var contents 	= fs.readFileSync(__dirname + '/../config/config.yaml', 'utf-8');
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