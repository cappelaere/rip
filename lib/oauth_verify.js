var openid 	= require('openid/openid'),
	fs		= require('fs'),
	crypto  = require('crypto'),
//	dcrypt	= require('dcrypt/dcrypt'),
	OAuth   = require('oauth/lib/oauth').OAuth
	util    = require('util'),
	http    = require('http'),
	https   = require('https'),
	Step	= require('../lib/step'),
	cfg		= require('../lib/config')
	User	= require('../app/models/user'),
 	url 	= require('url');

module.exports = OAuthVerify;


function OAuthVerify (obj) {
    if (!(this instanceof OAuthVerify)) return new OAuthVerify(obj);
    this.value = obj;
}

// Parse AX returned data into a resulting hash
function parse_ax_data( data, sreg_attrs, ax_attrs ) {
	var results = {};

	console.log("parsing ax_data:"+data);
	try{
	var json = JSON.parse(data);
	} catch(e) {
		console.log("json parsing error:"+e);
		return null;
	}
	//console.log(json);
	//console.log(ax_attrs); 
	
	var type = 'openid.ax.type.ext';
	var val  = 'openid.ax.value.ext';
	
	
	// get the sreg attrs
	for( var sreg in sreg_attrs) {
		var key 		= sreg_attrs[sreg];
		results[sreg] 	= json[key];
	}
		
	// get the ax attrs
	var i = 0;
	
	for( var x in ax_attrs ) {
		var ntype = type+i.toString();
		var ax    = json[ntype];
		
		for( var attr in ax_attrs ) {
			if( ax_attrs[attr] == ax ) {
				var index 		= val + i.toString()+"."+1;
				results[attr] 	= json[index];
				break; 
			}
		}
		i++;
	}
	
	return results
}

// check if user is valid, grants the consumer access
// and get the user credentials
function check_user_approved( oauth_parms, realm, callback ) {
	var user_openid 	= oauth_parms['oauth_token'];
	var consumer_openid = oauth_parms['oauth_consumer_key'];
	
	var ax_attributes = {
		'company': 		"http://axschema.org/x/company/name",
		'role':  		"http://axschema.org/x/company/role",
		'credential':   "http://axschema.org/x/contact/credential",
		'permissions': 	"http://axschema.org/x/company/permission"
	};
	
	var sreg_attributes = {
		'nickname': 	'openid.sreg.nickname',
		'email': 		'openid.sreg.email',
		'fullname':     'openid.sreg.fullname',
		'openid.mode':  'openid.mode'
	}
	// custom extension to force a json output format
	var format = {
		'requestParams': {
			'openid.format': 'json'
		}
	};

	var oauth = {
		'requestParams': {
			'openid.ns.oauth': 'http://specs.openid.net/extensions/oauth/1.0',
			'openid.oauth.consumer': consumer_openid,
			'openid.oauth.scope': realm
		}
	};

	var extensions = [
					 new openid.SimpleRegistration({
			            "nickname" : 	"required", 
			            "email" : 		"required", 
			            "fullname" : 	"optional"
			          }),
	                 new openid.AttributeExchange( {
	                        "http://axschema.org/x/company/name": "required",
	                        "http://axschema.org/x/company/role": "required",
	                        "http://axschema.org/x/contact/credential": "required",
	                        "http://axschema.org/x/company/permission": "required"
	                 }),
					oauth,
					format
					];
		
	var relyingParty = new openid.RelyingParty(
        server_url,			// Verification URL (yours)
        server_url,			// Realm (optional, specifies realm for OpenID authentication)
        false, 				// Use stateless verification
        false, 				// Strict mode
        extensions); 		// List of extensions to enable and include

		// Resolve identifier, associate, and build authentication URL
		var immediate = true;
		
		relyingParty.authenticate(user_openid, immediate, function(authUrl) {
			if (!authUrl) {
				console.log("***consumer openid error");
				return false;
			} else {
				var uri  = url.parse(authUrl);
				var path = uri.pathname+uri.search;
				var host = uri.host;
				
				var options = {
				  host: host,
				  path: path,
				  method: 'GET'
				};
				console.log(util.inspect(options));
				https.get(options, function(res) {
				  	res.on('data', function(data) {
						var json = parse_ax_data(data, sreg_attributes, ax_attributes );
						if( json == null ) {
							console.log("Error parsing ax data");
							return callback(-1, null);
						} else {
							console.log("parse_ax_data:"+json.size);
							return callback( null, json );
						}
				  	});
				}).on('error', function(e) {
				  	console.log("Got error: " + e.message);
					return false;
				});
				
			}
		});
}

// check if the consumer is trusted and if the signature matches
function check_trusted_app( consumer, realm, callback ) {
	
	// custom extension to force a json output format
	var format = {
		'requestParams': {
			'openid.format': 'json'
		}
	};
	
	var ax_attributes = {
		'name': 		"http://axschema.org/x/webapp/name",
		'url':  		"http://axschema.org/x/webapp/url",
		'description':  "http://axschema.org/x/webapp/description",
		'cert':         "http://axschema.org/x/webapp/cert"
	}
	
	var extensions = [
	                  new openid.AttributeExchange(
	                      {
	                        "http://axschema.org/x/webapp/name": 		"required",
	                        "http://axschema.org/x/webapp/url": 		"required",
	                        "http://axschema.org/x/webapp/description": "required",
	                        "http://axschema.org/x/webapp/cert": 		"required"
	                      }),
						format
					];
	
	var relyingParty = new openid.RelyingParty(
        consumer, 		// Verification URL (yours)
        consumer, 		// Realm (optional, specifies realm for OpenID authentication)
        false, 		// Use stateless verification
        false, 		// Strict mode
        extensions); // List of extensions to enable and include

		// Resolve identifier, associate, and build authentication URL
		var immediate = true;
		
		relyingParty.authenticate(consumer, immediate, function(authUrl) {

			if (!authUrl) {
				console.log("***consumer openid error");
				return false;
			} else {
								
				var uri  = url.parse(authUrl);
				var path = uri.pathname+uri.search;
				var host = uri.host;
				
				var options = {
				  host: host,
				  //port: 443,
				  path: path,
				  method: 'GET'
				};
				
				https.get(options, function(res) {
				  	//console.log("Got response: " + res.statusCode);
				  	res.on('data', function(data) {
					 
						var sreg_attributes = {};
						var json = parse_ax_data(data, sreg_attributes, ax_attributes);
						
						return callback( null, json['cert'] );
				  	});
				}).on('error', function(e) {
				  	console.log("Got error: " + e.message);
					return false;
				});
				
			}
		});
}

var parse_oauth_headers = function(req) {
	var oauth_headers 	= req.headers['authorization'];
	var host			= req.headers['host'];
	
	if( oauth_headers == undefined ) {
		console.log("No OAUTH Headers")
		return null;
	}
	var oauth_arr 		= oauth_headers.split(',');
	var realm;
	
	var oauth_parms = {};
	if( oauth_arr[0].indexOf("realm") >= 0 ) {
		realm = oauth_arr[0].split('=')[1].replace(/\"/g, '');
		
		delete oauth_arr[0];
	} else {
		console.log("realm not found");
	}
	
	for( var a in oauth_arr ) {
		var b = oauth_arr[a].split('=');
		var key = b[0].replace(' ','');
		oauth_parms[key] = unescape(b[1].replace(/\"/g,''));
	}
	
	return {'realm':realm, 'parms': oauth_parms};
}


// Check if consumer has a valid OAuth header
OAuthVerify.prototype.check = function (req, res, callback) {
		
	var oh 			= parse_oauth_headers(req);
	if( oh == null ) {
		return false;
	}
	var realm 			= oh.realm;
	var oauth_parms 	= oh.parms;
	var host			= req.headers['host'];
		
	var nonce 			= oauth_parms['oauth_nonce'];
	var consumer_key 	= oauth_parms['oauth_consumer_key'];
	
	var body			= req.body;
	var content_type	= req.headers['content-type'];
	
	if( content_type == 'application/json') {
		var hmac 	= crypto.createHash("sha1");
		var hash 	= hmac.update(JSON.stringify(body));
		var body_hash 	= hmac.digest(encoding="base64");
		//console.log("body:"+JSON.stringify(body));
		//console.log("body_hash:"+body_hash);
		//console.log("oauth_parms['body_hash']:"+oauth_parms['oauth_body_hash']);
		
		if( body_hash != oauth_parms['oauth_body_hash']) {
			throw "Failed oauth_body_hash compare";
		}
	}
	
	// Perform the many validation steps
	Step(
		function validate_realm() {
			if( (realm == undefined) || (realm != cfg.realm)) {
				console.log("*** invalid realm");
				throw "Invalid realm";
			}
			return true;
		},
		function check_nonce(err) {
			if( err ) throw(err);
			
			return true;
		},
		function check_trusted_domain(err) {
			if( err ) throw err;
			
			return true;
		},
		function trusted_app(err) {
			if( err ) throw err;
			check_trusted_app(consumer_key, realm, this);
		},
		function check_signature(err, public_key) {
			if(err ) throw err;
			
			var url = 'http://'+host + req.url;
			var sig = oauth_parms['oauth_signature'];
			delete oauth_parms['oauth_signature'];

			var oauth = new OAuth( null, null, null, null, null, null, 'RSA-SHA1');
			var signatureBase = oauth._createSignatureBase('POST', url, oauth._normaliseRequestParams(oauth_parms));
			//console.log("signatureBase:"+signatureBase);
			//console.log("sign:"+sig);
			//console.log("PubKey:"+public_key);
			
			var verified = !!dcrypt.verify.createVerify("RSA-SHA1").update(signatureBase).verify(public_key, sig, "base64");
			if( verified) {
				//console.log("signature verified");
				return true;	
			} else {
				//console.log("signature did not verify");
				throw "Signature did not verify";
			}
		},
		function user_approved(err) {
			//console.log("check user_approved...");
			if( err ) throw err;
			check_user_approved(oauth_parms, realm, this);
		},
		function parse_user_data(err, json) {
			//console.log("parse user data...err:"+err+" json"+JSON.stringify(json));
			if( err ) {
				//console.log("parse_user_data err:"+err);
				delete req.session.user;
				throw err;
			}
 
			if( json['openid.mode'] == 'setup_needed') {
				delete req.session.user;
				throw "User did not authorize transaction"
			} else {
				User.get_by_email(json['email'], function(err, user){
					if( err ) {
						// create a new user and save it
						user = new User( json['nickname'], json['fullname'], json['email'], json['openid'], 
									json['credential'], json['permissions']);
									
						console.log("saving new user:"+json['email']);

					} else {
						// user exists, just update perms and credentials
						user.nickname 	= json['nickname'];
						user.fullname 	= json['fullname'];
						user.credential = json['credential'];
						user.permissions= json['permissions'];
						console.log("updating user:"+json['email']);
					}
					
					user.save( function(err, u) {
						req.session.user = u;
						console.log("user saved");
						callback(null);
					})
				})

			}
		},
		function done(err ) {
			if( err ) {
				console.log("OAuth Check Done but err:"+err)
				callback(err);
			} else {
				callback(null);
			}
		}
	);
};