var util		= require('util'),
	url 	 	= require('url'),
	async		= require('async'),		
	querystring = require('querystring'),
	redis		= require('redis'),
	pubsub		= require('../../lib/pubsub'),
	cfg			= require('../../lib/config');

var ga_list		= cfg.root_service+":geoactivities:"
  , ga_count	= cfg.root_service+":geoactivities:count"
  , ga_id		= cfg.root_service+":geoactivities:id:"
  , ga_user		= cfg.root_service+":geoactivities:user:";

var resource_types 				= [ 'feasibility', 'radarsat-server', 'task', 'product' ];
var resource_type_collections 	= [ 'feasibilities', 'radarsat-server', 'tasks', 'products' ];


var verbs = {
	'add': 		'added',
	'complete': 'completed',
	'delete': 	"deleted", 
	'download':	"downloaded", 
	'join':    	'joined',
	'leave': 	'left',
	'process': 	'processed', 
	'save': 	'saved',
	'shared': 	"shared", 
	'start': 	'started',
	'tag': 		'tagged',
	'update': 	'updated',
};

// create a title
var get_title = function(user, g) {
  	var title = user.nickname + " - " + verbs[g.verb] + " " + resource_types[g.resource_type];	
	return title;
};

// add a description
var get_description = function(user, g) {
	var description = get_title(user, g) + " at " + g.createdAt;	
	return description;
};

// view-source:http://localhost:3000/wcps/geoactivities

var GeoActivity = exports = module.exports = function GeoActivity(user, verb, 
	resource_id, resource_type, description, hash ) {

  if( user == undefined ) return this;

  this.userid			= user.id;
  this.verb 			= verb;
  this.resource_id		= resource_id;
  this.resource_type	= resource_type;
  this.createdAt 		= new Date;
  this.updatedAt 		= new Date;
  this.tags				= user.nickname+", "+verb+", "+resource_types[resource_type];
  this.title			= get_title(user, this);
  this.hash				= hash;

  if( description == undefined) {
    this.description	= get_description(user, this);
  } else {
	this.description    = description;
  }
};

// create a new geoactivity from deserialized JSON Object
GeoActivity.newInstance = function(obj, callback) {
	//console.log("instantiating new geoActivity from:"+util.inspect(obj));
	//var user 		= User.newInstance(obj.user);
	
	var ga      	= new GeoActivity();
	
	for( var key in obj ) {
		ga[key] = obj[key];
	}
	
	User.get(ga.userid, function(err, u ) {
		ga.user = u;
		callback(err, ga)
	});
}

GeoActivity.prototype.object_type = function(){
  return resource_types[this.resource_type];
};

GeoActivity.prototype.link = function(){
  if(this.resource_type == 1 ) return server_url+'/'+cfg.root_service;

  return server_url+'/'+cfg.root_service+'/'+resource_type_collections[this.resource_type]+"/"+this.resource_id;
};

GeoActivity.prototype.ga_link = function(){
  return server_url+'/'+cfg.root_service+'/geoactivities/'+this.id;
};

GeoActivity.prototype.save = function(fn){
	var ga = this;
	
	app.db.incr(ga_count, function(err, id){
		if( err ) {
			fn(err);
		} else {
			ga.id = id;
		  	app.db.set(ga_id+id, JSON.stringify(ga));
		  	app.db.set(ga_user+ ga.userid, id);
			// add it to the geoactivites list as well, so we can sort ASC or DECR
			app.db.rpush( ga_list, ga_id+id);
			
			// make sure that the list does not grow more than 1000 entries
			app.db.llen(ga_list, function(err, data) {
				var llen = data;
				if( llen == 1000 ) {
					app.db.lpop(ga_list);
				} else if( llen > 1000 ) {
					app.db.ltrim( ga_list, -1, -1000);					
				}
			});
		  	pubsub.publish("/geoactivities.atom");
			fn(null);
		}
	});
};

GeoActivity.prototype.validate = function(fn){  
  fn(null);
};

GeoActivity.prototype.to_json = function(fn){
  var json = {
	"id": 			this.id,
	"title": 		this.title,
	"description": 	this.description,
	"published": 	this.updatedAt,
	"link": 		this.ga_link(), 
	"actor": {
		"url": 			server_url+'/'+cfg.root_service+'/users/'+this.userid,
		"objectType": 	"person",
		"id": 			'tag:'+cfg.root_service+'.sps.geobliki:user:'+this.userid },
	"verb": 			this.verb,
	"object": {
		"url": 			this.link(),
		"objectType": 	resource_types[this.resource_type],
		"id": 			"tag:"+cfg.root_service+".sps.geobliki:"+resource_types[this.resource_type]+":"+this.resource_id
	},
	"hash": 		this.hash
  };

 
  fn(null, json);
  
};

GeoActivity.prototype.destroy = function(fn){
  app.db.del(ga_id+this.id);
  app.db.lrem( ga_list, 0, ga_id+this.id, function(){});
  app.db.lrem(ga_user+this.user.id, function(){});
  fn(null);
};

exports.destroy = function(id, fn) {
  app.db.get(ga_id+id, function(err, data) {
	if( err ) {
		fn(err);
	} else {
		var ga = JSON.parse(data);
		ga.destroy;
		fn(null);
	}
  })
};

// return some statistics
exports.stats = function(fn) {
	var str;
	var first_entry, last_entry;
	
	app.db.llen(ga_list, function(err, data) {
		str = "Number of Entries:"+data+"<br/>";
		
		app.db.lindex(ga_list, 0, function(err, data ) {
			str += "First Entry:"+data+"<br/>";
			
			app.db.lindex(ga_list, -1, function(err, data ) {
				str += "Last Entry:"+data+"<br/>";
				fn(str);
			});
		});
	});
}

// number of entries in the list
exports.count = function( fn ){
  return app.db.llen(ga_list, fn); 
};

exports.sort = function(mode,start,count, fn) {
 app.db.sort( ga_list, 'LIMIT', start, count, mode, 'alpha', function(err, data){	
	var arr = [];
	async.map(data, function(key, callback) {
			app.db.get(key, function(err, data ) {
				if( err ) console.log("Err:"+err);
				GeoActivity.newInstance(JSON.parse(data), function(err, ga){
					callback(err, ga);			
				});
			})
	    }, fn);
  });	
}
exports.all = function(fn){
 
  app.db.sort( ga_list, 'desc', 'alpha', function(err, data){	
	var arr = [];
	async.map(data, function(key, callback) {
			app.db.get(key, function(err, data ) {
				if( err ) console.log("Err:"+err);
				GeoActivity.newInstance(JSON.parse(data), function(err, ga){
					callback(err, ga);			
				});
			})
	    }, fn);
  });
};

exports.get = function(id, fn){
  app.db.get(ga_id+id, function(err, data) {
	if( err ) {
		fn(err);
	} else {
		console.log("get:"+data);
		GeoActivity.newInstance(JSON.parse(data), function(err, ga) {
			fn(err, ga);			
		});
	}
  })
};


exports.FEASIBILITY 	= 0;
exports.APPLICATION 	= 1;
exports.TASK 			= 2;
exports.PRODUCT			= 3;
