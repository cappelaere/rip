var util		= require('util');
var path		= require('path');
var _			= require('underscore');
var async		= require('async');

module.exports = {

	index: function(req, res) {				
		console.log("services params:"+util.inspect(req.params))
		console.log("services query:"+util.inspect(req.query))

		var results = []
		app.db.smembers('services', function(err, replies) {	
			console.log(util.inspect(replies));
			async.forEach(replies, function(r, callback) {
				app.db.get('services:'+r, function(err, data) {
					var json = JSON.parse(data)					
					results.push(json)
					callback()
				})
			}, function(err) {
				var sresults = _.sortBy(results, function(r) { return -(r.passes - r.failed); })
				res.render("services/index.jade", {results: sresults});									
			})
		});
	},
	
	form: function(req, res) {
		console.log("form service");
		res.render("services/form.jade");
	},
	
	create: function(req, res) {
		var url = req.body.params['url'];
		var user = User.newInstance(req.session.user);
		
		// check if it already exists
		app.db.sismember('services', url, function(err, result) {
			//if( result ) {
			//	return res.send("URL already exists");
			//} else {
				// add it
				console.log("Add url:"+url+" to db");
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
			//}
		});		
	},
	
	show: function(req, res) {
		var id = req.params['id'];
		console.log("show service:"+id);
		res.render("services/show.jade");
	}
}