var util		= require('util'),
	async		= require('async'),
	pubsub		= require('../../lib/pubsub');
	
	
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

// create a new process from deserialized JSON Object
Test.newInstance = function(obj) {
	
	var test = new Test();
	for( var key in obj ) {
		test[key] = obj[key];
	}
	return test;
}

// stringify JSON object and return it as a string
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

Test.prototype.save = function(fn){
 	var test = this;
	
	try {
		app.db.incr(tests_count, function(err, id) {
			if( err ) {
				console.log("Error saving test");
				fn(err, null);
			} else {
				test.id = id;
				console.log("storing test id:"+test.id);
				
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
					console.log("Adding to hash "+ err + " "+ service_id);
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
	} catch(e) { console.log("Exception saving test:"+e)}
}

// delete all db entries for a test
Test.prototype.destroy = function(fn){
	console.log("destroying:"+this.id);

	app.db.del(details_instance+this.id);
	app.db.del(test_instance+this.id);

	app.db.srem( tests_list, this.id);

	app.db.srem( services_tests_list, this.id);

	fn(null);
};

// destroy by test id
exports.destroy = function(id, fn) {
  app.db.get(test_instance+id, function(err, data) {
	if( err ) {
		console.log("destroy error trying to get test:"+id)
		fn(err);
	} else {
		var test = Test.newInstance(JSON.parse(data));
		test.destroy(fn);
	}
  })
};

// return test by test id
exports.get_by_id = function(id, fn){
  app.db.get(test_instance+id, function(err, data) {
	if( err || !data ) {
		console.log("Err:"+err+" trying to get test:"+id);
		fn(err, null);
	} else {
		var obj = JSON.parse(data)
		//console.log("Got:"+util.inspect(data));
		var test = Test.newInstance(obj);
		fn(null, test);
	}
  })
};

// return all services ids
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
					delete json["output"];
					el.latest = json
					callback(err, el)					
				})
			})
		}, function(err, results) {
			fn(err, results);
		})
	})
}

// retrieve all tests for a particular service
exports.get_all_tests_for_service = function( url, fn) {
	app.db.hget(services_hash, url, function(err, id) {
		app.db.smembers(services_tests_list+id, function(err, list) {
			async.map(list, function(id, callback) {
				app.db.get( test_instance+id, function(err, test) {
					//console.log(test)
					var json = JSON.parse(test);
					if( json ) {
						delete json["output"];
						callback(err, json)	
					} else {
						console.log("Error getting test:"+id);
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



