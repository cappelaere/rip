var fs			= require('fs');
var util		= require('util');
var path		= require('path');
var _			= require('underscore');
var async		= require('async');
var debug 		= require('debug')('services');

module.exports = {

	index: function(req, res) {				

		var results = []
		app.db.smembers('services', function(err, replies) {	
			async.forEach(replies, function(r, callback) {
				app.db.get('services:'+r, function(err, data) {
					var json = JSON.parse(data)					
					if( json ) {
						json.url = r;
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
					})
				res.render("services/index.jade", {results: sresults});									
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
	
	show: function(req, res) {
		var id = req.params['id'];
		debug("show service:"+id);
		res.render("services/show.jade");
	}
}