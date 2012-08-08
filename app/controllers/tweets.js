var	sys 			= require('sys'),
	//twitter			= require('ntwitter'),
	tu				= require('tuiter'),
	util			= require('util'),
	cfg				= require('../../lib/config');

module.exports = {
 
	index: function(req, res) {
		var params = { 'count': 100 };
		twit = new tu ({
			consumer_key: 			cfg.twitter_consumer_key,
			consumer_secret: 		cfg.twitter_consumer_secret,
			access_token_key: 		cfg.twitter_oauth_token,
			access_token_secret: 	cfg.twitter_oauth_secret
		});
		console.log(util.inspect(twit));

		twit.homeTimeline({'include_rts':false}, function(err, data) {
			console.log("err:"+err);
			console.log(data);
		})
		
	}
};