// Fake data store
var util		= require('util'),
	cfg			= require('../../lib/config'),
	User		= require('../models/user'),
	crypto		= require('crypto'),
	async		= require('async');	// warning test change
	

var users_list	= cfg.root_service+":users:"
  , users_count	= cfg.root_service+":users:count"
  , users_id	= cfg.root_service+":users:id:"
  , users_email	= cfg.root_service+":users:email:";

function user_id_key(u) {
	return users_id+u.id;
}

function user_email_key(u) {
	return users_email+u.email;
}

var User = exports = module.exports = function User(nickname, fullname, email, openid, credential, permissions, licenses ) {
  //this.id 			= ++user_ids;
  this.nickname 			= nickname;
  this.fullname 			= fullname;
  this.email 				= email;
  this.createdAt 			= new Date;
  this.updatedAt 			= new Date;
  this.openid				= openid;
  this.credential			= credential;
  this.permissions			= permissions;
  if( licenses == undefined ) {
	this.licenses_accepted = {};
  } else { 
	this.licenses_accepted	= licenses;
  }
  this.is_local				= true;
};

// deserializer from a JSON object
User.newInstance = function( obj ) {
	var user 		= new User;

	for( var key in obj ) {
		user[key] = obj[key];
	}
	return user;
}

User.prototype.isAdmin = function() {
	var result = this.hasPerm('nasa:admin');
	return result;	
};

// This is used in lieu of an openid... it needs to be passed in an url and be obfuscated
User.prototype.passkey = function() {
	var shasum = crypto.createHash('sha1');
	shasum.update(openid);
	return shasum.digest('hex');
};

User.prototype.hasPerm = function(p) {
	if( this.permissions == undefined) {
		console.log("user:"+this.id+" has no perms");
		return false;
	}
	var result= this.permissions.indexOf(p) >= 0;
	return result;
};
 
User.prototype.save = function(fn){
	var user = this;
	app.db.exists( user_email_key(user), function(err, data) {
		if( err ) {
			console.log("saving error:"+err);
			return fn(err, null);
		}
		if( data ) {
			if( user.id == undefined ) {
				app.db.get(user_email_key(user), function(err, data) {
					user.id = data;
					console.log("save and updating user id:"+user.id);
					app.db.set(user_id_key(user), JSON.stringify(user));		
					return fn(null, user);
				});
			} else {
				console.log("save but exists user id:"+user.id);				
				app.db.set(user_id_key(user), JSON.stringify(user));		
				return fn(null, user);
			}
		} else {
			// else increment and save with a new id
		    console.log("saving user:"+user.nickname);
			app.db.incr(users_count, function(err, id){
				if( err ) {
					fn(err, null);
				} else {
					user.id = id;
				  	app.db.set(user_id_key(user), JSON.stringify(user));
				  	app.db.set(user_email_key(user), id);
					fn(null, user);
				}
			});
		}
	});
};

User.prototype.validate = function(fn){
	// make sure we have a valid email address
  fn(null);
};


User.prototype.update = function(data, fn){
  this.updatedAt = new Date;
  for (var key in data) {
    if (undefined != this[key]) {
      this[key] = data[key];
    }
  }
  this.save(fn);
};

User.prototype.destroy = function(fn){
  //exports.destroy(this.id, fn);
  console.log("destroy user:"+this.id);
  app.db.del(user_id_key(this));
  app.db.del(user_email_key(this));
  fn(0, null);
};

exports.count = function(fn){
  //fn(null, Object.keys(users).length);
  return app.db.get(users_count);
};

exports.all = function(fn){
  //console.log("All users...");
  var all_users = users_id+"*";
  app.db.keys( all_users, function(err, data) {	
	var arr = [];
		
	//console.log(data);
	async.map(data, function(key, callback) {
		console.log("get user for key:"+key)
		app.db.get(key, function(err, data ) {
			if( err ) console.log("Err:"+err);
			var user = User.newInstance(JSON.parse(data));
			callback(err, user);
		})
	}, fn);	
  });
};

exports.get_by_email = function(email, fn) {
	app.db.get(users_email+email, function(err, data) {
		if( err ) {
			console.log("Err user get_by_email:"+err);
			fn(err, null);
		} else {
			if( data == null || data == undefined) {
				console.log("null data found user by email:"+data);
				return fn(-1, null);
			}
			console.log("found user by email:"+data);
			app.db.get(users_id+data, function(err, data) {
				var user = User.newInstance(JSON.parse(data));
				fn(err, user);
			});
		}
	})
}; 

exports.get = function(id, fn){
  app.db.get(users_id+id, function(err, data) {
	if( err ) {
		console.log("Err:"+err+" trying to get user:"+users_id+id);
		fn(err, null);
	} else {
		var user = User.newInstance(JSON.parse(data));
		fn(null, user);
	}
  })
};