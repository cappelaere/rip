var util    	= require('util'),
	User		= require('../models/user'),
	GeoActivity = require('../models/geoactivity'),
	cfg			= require('../../lib/config'),
	//session		= require('session'),
	openid  	= require('openid/openid');

//	var env = process.env.NODE_ENV || 'development';
	var env = process.env.NODE_ENV || 'production';

module.exports = {
  
	// service document
	index: function(req, res) {
		if( env == 'development') {			
			var email 		= null;
			var identifier 	= null;
			var req_url;
			
			if( req.query ) {
				if( req.query.email != undefined ) email = req.query['email'];
				if( (email == null) && req.body && req.body.email != undefined ) {
					email = req.body['email'];
				}
				if( req.query.req_url != undefined) req_url = req.query.req_url;
			}
			
			if( email != null) {
				console.log("session login - user email:"+email);
				User.get_by_email(email, function(err, user ) {
					if( !err) {
						console.log(user);
						req.session.user 	= user;
						//session.user 		= user;
						//var geoact 			= new GeoActivity(user, 'login', 0, GeoActivity.APPLICATION );
						//geoact.save( function(err){});
						
						if( req_url != undefined && req_url != "undefined") {
							console.log("session redirect to "+ req_url)
							return res.redirect(req_url, 302);						
						} else {
							console.log("session redirect to home")
							return res.redirect("/"+cfg.root_service, 302);
						}
					} else {
						var msg = "Invalid User Email!";
						console.log(msg);
						req.flash('error', msg);
						//return res.send("Unauthorized", 401);
						return res.redirect("/"+cfg.root_service+"/session/login", 401);
					}
				});
			} else {
				console.log("session null email");
			}
			return;
		}
		
		if ( req.query && req.query.op_url != undefined ) identifier = req.query['op_url'];
		if( identifier == null && req.body && req.body.op_url != undefined ) identifier = req.body['op_url'];
		
		if( identifier == null ) {
			return res.send("Missing Login Identitifer", 404);
		} else {
			console.log( "session with:"+identifier);
		}
		var extensions = [new openid.UserInterface(), 
		                  new openid.SimpleRegistration(
		                      {
		                        "nickname" : true, 
		                        "email" : true, 
		                        "fullname" : true
		                      }),
		                  new openid.AttributeExchange(
		                      {
		                        "http://axschema.org/contact/email": "required",
		                        "http://axschema.org/x/company/permission": "required",
		                        "http://axschema.org/x/contact/credential": "required",
		                        "http://axschema.org/x/company/title": "required",
		                        "http://axschema.org/x/company/name": "required"
		                      })];

		var return_to = "http://"+req.headers.host + '/'+cfg.root_service+'/session/open_id_complete';
		console.log("return_to:"+return_to);
		
		var relyingParty = new openid.RelyingParty(
		    return_to, // Verification URL (yours)
		    null, // Realm (optional, specifies realm for OpenID authentication)
		    false, // Use stateless verification
		    false, // Strict mode
		    extensions); // List of extensions to enable and include

		// Resolve identifier, associate, and build authentication URL
		relyingParty.authenticate(identifier, false, function(error, authUrl) {
			console.log("authenticate:"+identifier+" error:"+error+" authUrl:"+authUrl);
			if (!authUrl) {
				res.writeHead(500);
				res.end();
			} else {
				res.writeHead(302, { Location: authUrl });
				res.end();
			}
	    });		
	},
	
	open_id_complete: function(req,res) {
		console.log("session open_id_complete"+ util.inspect(req.query));
		var nickname 		= req.query['openid.sreg.nickname'];
		var fullname		= req.query['openid.sreg.fullname'].replace(/\+/g, ' ');;
		var email			= req.query['openid.sreg.email'];
		var credential		= req.query['openid.ax.value.ext0.1'];
		
		var count_perms     = 0;
		
		if( req.query['openid.ax.count.ext3'] != undefined ) {
			count_perms			= parseInt(req.query['openid.ax.count.ext3']);
			var permissions		= new Array(count_perms);
		}
		
		for( i=1; i<= count_perms; i++ ) {
			var key   = 'openid.ax.value.ext3.'+i;
			var value = req.query[key]
			permissions[i-1] = value; 
		}
	
		var user = new User(nickname, fullname, email, openid, credential, permissions, {});
		console.log("Save user...")
		user.save( function(err, u){
			//var geoact = new GeoActivity(u, 'login', 0, GeoActivity.APPLICATION );
			//geoact.save( function(err){});
			console.log("redirect to /"+cfg.root_service)
			
			req.session.user = u;
			res.redirect("/"+cfg.root_service, 302);			
		});
	},
	
	login: function(req,res) {
		var req_url ="/";
		
		if( req.query && req.query.requested_url ) {
			req_url = req.query.requested_url;
		}
		console.log("login req_url:"+req_url);
		
		res.render('session/login.ejs', {env: env, req_url: req_url});	
	},
	
	logout: function(req,res) {
		//var geoact = new GeoActivity(req.session.user, 'logout', 0, GeoActivity.APPLICATION);
		//geoact.save( function(err){});

		req.session.user = null;
		
		res.redirect("/"+cfg.root_service, 302);
	},
	
	check: function(req,res) {
		if( req.session.user) {
			console.log("user session")
			return res.render('session/logout.ejs')
		} else {
			return res.redirect('/session/login')
		}
	}
};