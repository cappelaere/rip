var util		= require('util'),
	async		= require('async'),
	eyes		= require('eyes'),
	pubsub		= require('../../lib/pubsub'),
	debug 		= require('debug')('tests');
	
	
// A test is saved as test_instance
// test_id is added to tests_list
// service is added to services_hash
// test_id of that service is added to that service test list

var tests_list			= "rip:tests"
	services_hash		= "rip:services",
	services_tests_list = "rip:services:id:" 
  , tests_count			= "rip:tests:count"
  , test_instance		= "rip:test:id:"
  , details_instance	= "rip:details:id"

var Test = exports = module.exports = function Test(
	userid, url, stats, options, level, version, output ) {

	this.userid			= userid;
	this.url			= url;
	this.level			= level;
	this.stats 			= stats;
	this.options		= options;
	this.version		= version;
	this.output			= output;	// actual test results
};

// Create a new process from deserialized JSON Object
Test.newInstance = function(obj) {
	
	var test = new Test();
	for( var key in obj ) {
		test[key] = obj[key];
	}
	return test;
}

// Stringify JSON object and return it as a string
Test.prototype.media_json = function() {
	var test = this;
	
	delete test['output'];
	test.kind = "rip#Test";
	test['links'] = {
		'self': {	
			'href': server_url+"/tests/"+test.id+".json",
			'type': 'application/json',
			"describedby": server_url+"/discovery/Test.properties"
		},
		'delete': {
			'href': server_url+"/tests/"+test.id+"/destroy"
		},
		'details': {
			'href': server_url+"/tests/"+test.id+"/results",
			'type': 'text/html'
		}
	}
	
	var str = JSON.stringify(test);
	test['etag'] = str.sha1_hex();
	return test;
}

// Save Test
Test.prototype.save = function(fn){
 	var test = this;
	
	try {
		app.db.incr(tests_count, function(err, id) {
			if( err ) {
				console.error("Error saving test");
				fn(err, null);
			} else {
				test.id = id;
				debug("storing test id:"+test.id);
				
				// save test output separately for later retrieval speed... not always needed
				var output = test.output;
			  	app.db.set(details_instance+id, output);
			
				// save the rest
				delete test.output;
			  	app.db.set(test_instance+id, JSON.stringify(test));
		  	
				// add test id in tests list
				app.db.sadd(tests_list, test.id);
			
				// add service url in service hash set as necessary
				var service_id;
				app.db.hget( services_hash, test.url, function(err, service_id) {
					debug("Adding to hash "+ err + " "+ service_id);
					if( !service_id ) {
						app.db.hlen(services_hash, function(err, len) {
							service_id = len+1;
							app.db.hset(services_hash, test.url, service_id)							
							app.db.sadd(services_tests_list+service_id, test.id);
						})
					} else {
						app.db.sadd(services_tests_list+service_id, test.id);
					}
					pubsub.publish("/tests.atom");
				})				
				if( fn ) fn(null, test);
			}
		})
	} catch(e) { console.error("Exception saving test:"+e)}
}

// Delete all db entries for a test
Test.prototype.destroy = function(fn){
	debug("destroying:"+this.id);

	app.db.del(details_instance+this.id);
	app.db.del(test_instance+this.id);

	app.db.srem( tests_list, this.id);

	// we need to remove from the service url test list
	var url  = this.url;
	var tid  = this.id;
	app.db.hget(services_hash, url, function(err, sid) {
		debug("removing test id:"+tid+" from:"+services_tests_list+sid);
		app.db.srem( services_tests_list+sid, tid);
	});

	if(fn) fn(null);
};

// Destroy by test id
exports.destroy = function(id, fn) {
  app.db.get(test_instance+id, function(err, data) {
	if( err ) {
		console.error("destroy error trying to get test:"+id)
		if(fn) fn(err);
	} else {
		var test = Test.newInstance(JSON.parse(data));
		test.destroy(fn);
	}
  })
};

// Return test by test id
exports.get_by_id = function(id, fn){
  app.db.get(test_instance+id, function(err, data) {
	if( err || !data ) {
		debug("Err:"+err+" trying to get test:"+id+ " data:"+data);
		fn(err, null);
	} else {
		var obj = JSON.parse(data)
		//console.log("Got:"+util.inspect(data));
		var test = Test.newInstance(obj);
		fn(null, test);
	}
  })
};

// Return all services ids
exports.get_services = function(fn) { 
	app.db.hgetall(services_hash, function(err, list) {
		fn(err, list);
	})
}

//
// return only latest test for that service
//
exports.get_latest_test_for_service = function( id, fn) {
	app.db.smembers(services_tests_list+id, function(err, list) {
		var len 	= list.length;
		var last 	= list[len-1]
		fn(err, last);
	})
}

// get latest tests by service
exports.get_latest_tests_for_each_service = function(fn) {
	exports.get_services( function(err, list) {
		var arr = []
		for( k in list) {
			var el = {
				'id': list[k],
				'url': k,
			}
			arr.push(el)
		}
		async.map( arr, function( el, callback) {
			exports.get_latest_test_for_service(el.id, function(err, id) {
				app.db.get(test_instance+id, function(err, t) {
					var json = JSON.parse(t);
					if( json ) {
						delete json["output"];
						el.latest = json
						callback(err, el)					
					} else {
						debug("null data retrieving test:"+id)
						callback(err, null)					
					}
				})
			})
		}, function(err, results) {
			// let's filter the nul elements... something bad happened... let's not propagate it
			async.filter(arr, function(el, cb) {
				cb(	el.latest );
			}, function(non_null_results) {
				fn(err, non_null_results);				
			})
		})
	})
}

// retrieve all tests for a particular service
exports.get_all_tests_for_service = function( url, fn) {
	app.db.hget(services_hash, url, function(err, sid) {
		app.db.smembers(services_tests_list+sid, function(err, list) {
			async.map(list, function(tid, callback) {
				app.db.get( test_instance+tid, function(err, test) {
					//console.log(test)
					var json = JSON.parse(test);
					if( json ) {
						delete json["output"];
						callback(err, json)	
					} else {
						console.log("Error getting test:"+tid+" from:"+services_tests_list+sid);
						callback(err,null)
					}
				})			
			}, function(err, results) {
				fn(err, results);
			})
		})
	})
}

// get all tests
exports.get_all_tests = function(fn) {
	app.db.smembers( tests_list, function(err, list) {
		async.map(list, function( id, callback) {
			app.db.get( test_instance+id, function(err, test) {
				var json = JSON.parse(test);
				if( json ) {
					delete json["output"];
					callback(err, Test.newInstance(json).media_json())	
				} else {
					callback(err,null)
				}
			})			
		}, function(err, results) {
			fn(err, results);
		})
	})
}



