var fs			= require('fs');
var util		= require('util');
var path		= require('path');
var _			= require('underscore');
var async		= require('async');
var debug 		= require('debug')('services');
var crypto		= require('crypto');

function sha1_hex(s) {
    var hash = crypto.createHash('sha1');
    hash.update(s);
    return hash.digest('hex');
}

module.exports = {

	index: function(req, res) {				
		var fmt = req.params['format'];
		if( fmt == undefined && req.query) fmt = req.query['format'];
		if( fmt == undefined && req.query) fmt = req.query['fmt'];
		if( fmt == undefined && req.query) fmt = req.query['alt'];
		if( fmt == undefined && req.query) fmt = req.query['output'];
		if( fmt == undefined) {
			var accept = req.headers.accept;
			if( accept ) {
				//console.log("Accept:"+util.inspect(accept))
				if( accept.indexOf('application/json') >= 0 ){
					fmt = 'json';
				} else if( 	accept.indexOf('atom') >= 0 ){
					fmt = 'atom';
				} else if( 	accept.indexOf('html') >= 0 ){
					fmt = 'html'
				} else if( 	accept.indexOf('*/*') >= 0 ){
					fmt = 'html'					
				} else {
					console.log("invalid accept header:"+accept)
					return res.send(406)
				}
			}
		}

		var results = []
		app.db.smembers('services', function(err, replies) {
			var last_updated;
				
			async.forEach(replies, function(r, callback) {
				app.db.get('services:'+r, function(err, data) {
					var json = JSON.parse(data)					
					if( json ) {
						json.kind 		= "tests#testEntry"
						json.details 	= server_url+"/results?url="+r; 
						json.url 		= r;
						
						if( !last_updated || json.date > last_updated) last_updated = json.date;
						json.etag   = sha1_hex(JSON.stringify(json));
						
						results.push(json)
					}
					callback()
				})
			}, function(err) {
				var sresults = _.sortBy(results, function(r) { 
						if( !r.stats) { 
							r.stats = {
								'passes':0,
								'failures':0,
								'duration':0
							}
						}
						return -(r.stats.passes - r.stats.failures); 
				});
				
				var json_results = {
					'kind':         "tests#testList",
					'etag': 		sha1_hex(JSON.stringify(sresults)),
					'updated':  	last_updated,
					'selfLink':     global.server_url+"/services.json",
					'items': 		sresults
				}
				
				var if_none_match = req.headers["if-none-match"];
				var last_modified = req.headers["last-modified"];

				if( if_none_match && if_none_match==sresults['etag'] ) {
					return res.send(304);
				}

				if( last_modified && last_modified==sresults['updated']) {
					return res.send(304);
				}

				switch(fmt) {
					case 'json':
						res.header('Content-Type','application/json');
						res.header('ETag', json_results.etag);
						res.header('GData-Version', '2.0');	
						return res.send(json_results);
					
					case 'atom':
					case 'html':
						res.render("services/index.jade", {results: sresults});									
				}
			})
		});
	},
	
	form: function(req, res) {
		res.render("services/form.jade");
	},
	
	results: function(req, res) {
		var url = req.param('url');
		app.db.get('services:'+url, function(err, data) {
			var json = JSON.parse(data)	
			if( !json.stats) { 
				json.stats = {
					'passes':0,
					'failures':0,
					'duration':0
				}
			}				
			app.db.get('services:output:'+url, function(err, data) {
				res.render("services/results.jade", { 	url: url, 
														results:data,
														json: json,
														layout: false })
			});
		})
	},
	
	create: function(req, res) {
		var url 	= req.body.params['url'];
		var user 	= User.newInstance(req.session.user);
		
		// check if it already exists
		app.db.sismember('services', url, function(err, result) {
				var data = {
					'url': 			url,
					'userid': 		user.id,
					'submittor': 	user.fullname,
					'email': 		user.email,
					'date': 		new Date,
					'passes': 		0,
					'failed': 		0
				}
				app.db.sadd('services', url);
				app.db.set('services:' + url, JSON.stringify(data));				
				res.redirect("/services");
		});		
	},
	
	destroy: function(req, res) {
		var url 	= req.param('url');
		console.log("Destroy it:"+url);
		
		// check if it already exists
		app.db.sismember('services', url, function(err, result) {
			app.db.srem('services', url);
			// not that one 
			// app.db.del('services:' + url);				
			res.redirect("/services/3");			
		});
	},
	
	level: function(req, res) {
		var id = req.param('id') || 3;
		debug("service level:"+id);
		//res.render("services/level"+id+".jade");
		
		var results = []
		app.db.smembers('services', function(err, replies) {	
			async.forEach(replies, function(r, callback) {
				app.db.get('services:'+r, function(err, data) {
					var json = JSON.parse(data)					
					if( json ) {
						json.url = r;
						
						// for forward capability
						if( !json.rmm_level ) json.rmm_level = 1;
						
						results.push(json)
					}
					callback()
				})
			}, function(err) {
				//console.log(util.inspect(results))
				var sresults = _.filter(results, function(r) { 
					return (r.rmm_level && (r.rmm_level == id)); });
								
				sresults = _.sortBy(sresults, function(r) { 
						if( !r.stats) { 
							r.stats = {
								'passes':0,
								'failures':0,
								'duration':0
							}
						}
						return -(r.stats.passes - r.stats.failures); 
					})
				res.render("services/level"+id+".jade", {results: sresults});									
			})
		});

		
	},
	
	show: function(req, res) {
		var id = req.params['id'];
		debug("show service:"+id);
		res.render("services/show.jade");
	}
}