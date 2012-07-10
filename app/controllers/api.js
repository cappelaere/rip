var util		= require('util'),
	cfg			= require('../../lib/config'),
	discovery	= require('../../app/controllers/discovery'),
	query       = require('querystring'),
	session		= require('../../app/controllers/session');

	var apiConfig = {
		oauth: false,
		protocol: "http",
		publicPath: "/radarsat"
	};

module.exports = {	
	//
	// Middleware
	//
	oauth: function(req, res, next) {
	    console.log('OAuth process started');
	    var apiName = req.body.apiName;

	    if (apiConfig.oauth) {
	        var apiKey = req.body.apiKey || req.body.key,
	            apiSecret = req.body.apiSecret || req.body.secret,
	            refererURL = url.parse(req.headers.referer),
	            callbackURL = refererURL.protocol + '//' + refererURL.host + '/authSuccess/' + apiName,
	            oa = new OAuth(apiConfig.oauth.requestURL,
	                           apiConfig.oauth.accessURL,
	                           apiKey,
	                           apiSecret,
	                           apiConfig.oauth.version,
	                           callbackURL,
	                           apiConfig.oauth.crypt);

	        if (config.debug) {
	            console.log('OAuth type: ' + apiConfig.oauth.type);
	            console.log('Method security: ' + req.body.oauth);
	            console.log('Session authed: ' + req.session[apiName]);
	            console.log('apiKey: ' + apiKey);
	            console.log('apiSecret: ' + apiSecret);
	        };

	        // Check if the API even uses OAuth, then if the method requires oauth, then if the session is not authed
	        if (apiConfig.oauth.type == 'three-legged' && req.body.oauth == 'authrequired' && (!req.session[apiName] || !req.session[apiName].authed) ) {
	            if (config.debug) {
	                console.log('req.session: ' + util.inspect(req.session));
	                console.log('headers: ' + util.inspect(req.headers));

	                console.log(util.inspect(oa));
	                // console.log(util.inspect(req));
	                console.log('sessionID: ' + util.inspect(req.sessionID));
	                // console.log(util.inspect(req.sessionStore));
	            };

	            oa.getOAuthRequestToken(function(err, oauthToken, oauthTokenSecret, results) {
	                if (err) {
	                    res.send("Error getting OAuth request token : " + util.inspect(err), 500);
	                } else {
	                    // Unique key using the sessionID and API name to store tokens and secrets
	                    var key = req.sessionID + ':' + apiName;

	                    db.set(key + ':apiKey', apiKey, redis.print);
	                    db.set(key + ':apiSecret', apiSecret, redis.print);

	                    db.set(key + ':requestToken', oauthToken, redis.print);
	                    db.set(key + ':requestTokenSecret', oauthTokenSecret, redis.print);

	                    // Set expiration to same as session
	                    db.expire(key + ':apiKey', 1209600000);
	                    db.expire(key + ':apiSecret', 1209600000);
	                    db.expire(key + ':requestToken', 1209600000);
	                    db.expire(key + ':requestTokenSecret', 1209600000);

	                    // res.header('Content-Type', 'application/json');
	                    res.send({ 'signin': apiConfig.oauth.signinURL + oauthToken });
	                }
	            });
	        } else if (apiConfig.oauth.type == 'two-legged' && req.body.oauth == 'authrequired') {
	            // Two legged stuff... for now nothing.
	            next();
	        } else {
	            next();
	        }
	    } else {
	        next();
	    }

	},

	//
	// OAuth Success!
	//
	oauthSuccess: function(req, res, next) {
	    var oauthRequestToken,
	        oauthRequestTokenSecret,
	        apiKey,
	        apiSecret,
	        apiName = req.params.api,
	        apiConfig = apisConfig[apiName],
	        key = req.sessionID + ':' + apiName; // Unique key using the sessionID and API name to store tokens and secrets

	    if (config.debug) {
	        console.log('apiName: ' + apiName);
	        console.log('key: ' + key);
	        console.log(util.inspect(req.params));
	    };

	    db.mget([
	        key + ':requestToken',
	        key + ':requestTokenSecret',
	        key + ':apiKey',
	        key + ':apiSecret'
	    ], function(err, result) {
	        if (err) {
	            console.log(util.inspect(err));
	        }
	        oauthRequestToken = result[0],
	        oauthRequestTokenSecret = result[1],
	        apiKey = result[2],
	        apiSecret = result[3];

	        if (config.debug) {
	            console.log(util.inspect(">>"+oauthRequestToken));
	            console.log(util.inspect(">>"+oauthRequestTokenSecret));
	            console.log(util.inspect(">>"+req.query.oauth_verifier));
	        };

	        var oa = new OAuth(apiConfig.oauth.requestURL,
	                           apiConfig.oauth.accessURL,
	                           apiKey,
	                           apiSecret,
	                           apiConfig.oauth.version,
	                           null,
	                           apiConfig.oauth.crypt);

	        if (config.debug) {
	            console.log(util.inspect(oa));
	        };

	        oa.getOAuthAccessToken(oauthRequestToken, oauthRequestTokenSecret, req.query.oauth_verifier, function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
	            if (error) {
	                res.send("Error getting OAuth access token : " + util.inspect(error) + "["+oauthAccessToken+"]"+ "["+oauthAccessTokenSecret+"]"+ "["+util.inspect(results)+"]", 500);
	            } else {
	                if (config.debug) {
	                    console.log('results: ' + util.inspect(results));
	                };
	                db.mset([key + ':accessToken', oauthAccessToken,
	                    key + ':accessTokenSecret', oauthAccessTokenSecret
	                ], function(err, results2) {
	                    req.session[apiName] = {};
	                    req.session[apiName].authed = true;
	                    if (config.debug) {
	                        console.log('session[apiName].authed: ' + util.inspect(req.session));
	                    };

	                    next();
	                });
	            }
	        });

	    });
	},

	//
	// processRequest - handles API call
	//
	processRequest: function(req, res, next) {
	    console.log("api.processReq:"+util.inspect(req.body, null, 3));
	   
		var d 		= discovery.current_schema();

	    var reqQuery 	= req.body,
	        params 		= reqQuery.params || {},
	        methodURL 	= reqQuery.methodUri,
	        httpMethod 	= reqQuery.httpMethod,
	        apiKey 		= reqQuery.apiKey,
	        apiSecret 	= reqQuery.apiSecret,
	        apiName 	= reqQuery.apiName,
			accept		= reqQuery.accept,
			mediaType	= reqQuery.mediaType,
	        apiConfig 	= d,
	        key = req.sessionID + ':' + apiName;

		//console.log("***params:"+util.inspect(params));
		
	    // Replace placeholders in the methodURL with matching params
	    for (var param in params) {
	        if (params.hasOwnProperty(param)) {
	            if (params[param] !== '') {
	                // URL params are prepended with ":"
	                var regx = new RegExp('{' + param+"}");
					console.log("regex {"+param+"}");
	                // If the param is actually a part of the URL, put it in the URL and remove the param
	                if (!!regx.test(methodURL)) {
	                    methodURL = methodURL.replace(regx, params[param]);
	                    delete params[param];
						console.log("passed regex, parm deleted");
	                } else {
						console.log("Failed regex");
					}
	            } else {
	                delete params[param]; // Delete blank params
	            }
	        }
	    }
		
	    var baseHostInfo = req.headers.host.split(':');	//apiConfig.basePath.split(':');
	    var baseHostUrl  = baseHostInfo[0],
	        baseHostPort = (baseHostInfo.length > 1) ? baseHostInfo[1] : "";

	    var paramString = query.stringify(params);
		// console.log("params:"+paramString);
	
		var path = apiConfig.basePath + methodURL;
		
		if( httpMethod == 'GET') {
			path +=  ((paramString.length > 0) ? '?' + paramString : "");
		}
			
	    var    privateReqURL = apiConfig.protocol + '://' + apiConfig.baseURL + apiConfig.privatePath + methodURL + ((paramString.length > 0) ? '?' + paramString : ""),
	        options = {
	            headers: {},
	            protocol: apiConfig.protocol + ':',
	            host: baseHostUrl,
	            port: baseHostPort,
	            method: httpMethod,
	            path: path,
				accept: accept,
				mediaType: mediaType,
				params: params
	        };
			//console.log(util.inspect(options));

	    if (apiConfig.oauth) {
	        //console.log('Using OAuth');

	        // Three legged OAuth
	        if (apiConfig.oauth.type == 'three-legged' && (reqQuery.oauth == 'authrequired' || (req.session[apiName] && req.session[apiName].authed))) {
	            
	            console.log('Three Legged OAuth');
	            

	            db.mget([key + ':apiKey',
	                     key + ':apiSecret',
	                     key + ':accessToken',
	                     key + ':accessTokenSecret'
	                ],
	                function(err, results) {

	                    var apiKey = (typeof reqQuery.apiKey == "undefined" || reqQuery.apiKey == "undefined")?results[0]:reqQuery.apiKey,
	                        apiSecret = (typeof reqQuery.apiSecret == "undefined" || reqQuery.apiSecret == "undefined")?results[1]:reqQuery.apiSecret,
	                        accessToken = results[2],
	                        accessTokenSecret = results[3];
	                    console.log(apiKey);
	                    console.log(apiSecret);
	                    console.log(accessToken);
	                    console.log(accessTokenSecret);

	                    var oa = new OAuth(apiConfig.oauth.requestURL || null,
	                                       apiConfig.oauth.accessURL || null,
	                                       apiKey || null,
	                                       apiSecret || null,
	                                       apiConfig.oauth.version || null,
	                                       null,
	                                       apiConfig.oauth.crypt);

	                    if (config.debug) {
	                        console.log('Access token: ' + accessToken);
	                        console.log('Access token secret: ' + accessTokenSecret);
	                        console.log('key: ' + key);
	                    };

	                    oa.getProtectedResource(privateReqURL, httpMethod, accessToken, accessTokenSecret,  function (error, data, response) {
	                        req.call = privateReqURL;

	                        // console.log(util.inspect(response));
	                        if (error) {
	                            console.log('Got error: ' + util.inspect(error));

	                            if (error.data == 'Server Error' || error.data == '') {
	                                req.result = 'Server Error';
	                            } else {
	                                req.result = error.data;
	                            }

	                            res.statusCode = error.statusCode

	                            next();
	                        } else {
	                            req.resultHeaders = response.headers;
	                            req.result = JSON.parse(data);

	                            next();
	                        }
	                    });
	                }
	            );
	        } else if (apiConfig.oauth.type == 'two-legged' && reqQuery.oauth == 'authrequired') { // Two-legged
	            
	            console.log('Two Legged OAuth');
	            

	            var body,
	                oa = new OAuth(null,
	                               null,
	                               apiKey || null,
	                               apiSecret || null,
	                               apiConfig.oauth.version || null,
	                               null,
	                               apiConfig.oauth.crypt);

	            var resource = options.protocol + '://' + options.host + options.path,
	                cb = function(error, data, response) {
	                    if (error) {
	                        if (error.data == 'Server Error' || error.data == '') {
	                            req.result = 'Server Error';
	                        } else {
	                            console.log(util.inspect(error));
	                            body = error.data;
	                        }

	                        res.statusCode = error.statusCode;

	                    } else {
	                        console.log(util.inspect(data));

	                        var responseContentType = response.headers['content-type'];

	                        switch (true) {
	                            case /application\/javascript/.test(responseContentType):
	                            case /text\/javascript/.test(responseContentType):
	                            case /application\/json/.test(responseContentType):
	                                body = JSON.parse(data);
	                                break;
	                            case /application\/xml/.test(responseContentType):
	                            case /text\/xml/.test(responseContentType):
	                            default:
	                        }
	                    }

	                    // Set Headers and Call
	                    if (response) {
	                        req.resultHeaders = response.headers || 'None';
	                    } else {
	                        req.resultHeaders = req.resultHeaders || 'None';
	                    }

	                    req.call = url.parse(options.host + options.path);
	                    req.call = url.format(req.call);

	                    // Response body
	                    req.result = body;

	                    next();
	                };

	            switch (httpMethod) {
	                case 'GET':
	                    console.log(resource);
	                    oa.get(resource, '', '',cb);
	                    break;
	                case 'PUT':
	                case 'POST':
	                    oa.post(resource, '', '', JSON.stringify(obj), null, cb);
	                    break;
	                case 'DELETE':
	                    oa.delete(resource,'','',cb);
	                    break;
	            }

	        } else {
	            // API uses OAuth, but this call doesn't require auth and the user isn't already authed, so just call it.
	            unsecuredCall();
	        }
	    } else {
	        // API does not use authentication
	        unsecuredCall();
	    }

	    // Unsecured API Call helper
	    function unsecuredCall() {
	        console.log('Unsecured Call');

	        // Add API Key to params, if any.
	        if (apiKey != '' && apiKey != 'undefined' && apiKey != undefined) {
	            if (options.path.indexOf('?') !== -1) {
	                options.path += '&';
	            }
	            else {
	                options.path += '?';
	            }
	            options.path += apiConfig.keyParam + '=' + apiKey;
	        }

	        // Perform signature routine, if any.
	        if (apiConfig.signature) {
	            if (apiConfig.signature.type == 'signed_md5') {
	                // Add signature parameter
	                var timeStamp = Math.round(new Date().getTime()/1000);
	                var sig = crypto.createHash('md5').update('' + apiKey + apiSecret + timeStamp + '').digest(apiConfig.signature.digest);
	                options.path += '&' + apiConfig.signature.sigParam + '=' + sig;
	            }
	            else if (apiConfig.signature.type == 'signed_sha256') { // sha256(key+secret+epoch)
	                // Add signature parameter
	                var timeStamp = Math.round(new Date().getTime()/1000);
	                var sig = crypto.createHash('sha256').update('' + apiKey + apiSecret + timeStamp + '').digest(apiConfig.signature.digest);
	                options.path += '&' + apiConfig.signature.sigParam + '=' + sig;
	            }
	        }

	        // Setup headers, if any
	        if (reqQuery.headerNames && reqQuery.headerNames.length > 0) {
	            console.log('Setting headers');
	            
	            var headers = {};

	            for (var x = 0, len = reqQuery.headerNames.length; x < len; x++) {
	               
	                console.log('Setting header: ' + reqQuery.headerNames[x] + ':' + reqQuery.headerValues[x]);
	                
	                if (reqQuery.headerNames[x] != '') {
	                    headers[reqQuery.headerNames[x]] = reqQuery.headerValues[x];
	                }
	            }

	            options.headers = headers;
	        }

	        if (!options.headers['Content-Length']) {
	            options.headers['Content-Length'] = 0;
	        }
	
			if( options['method'] === 'POST') {
				var parms 		= { params: params };
				var str 		= JSON.stringify(parms);
				var length 		= str.length;
	            options.headers['Content-Length'] 	= length;
	            options.headers['Content-Type'] 	= options.mediaType;
	            options.headers['Accept'] 			= options.accept;
			}
	        
	        console.log("httpRequest options:"+util.inspect(options));
	       
	        // API Call. response is the response from the API, res is the response we will send back to the user.
	        var apiCall = http.request(options, function(response) {
	            response.setEncoding('utf-8');
	           
	            console.log('HEADERS: ' + JSON.stringify(response.headers));
	            console.log('STATUS CODE: ' + response.statusCode);
	            
	            res.statusCode = response.statusCode;

	            var body = '';

	            response.on('data', function(data) {
	                body += data;
	            })

	            response.on('end', function() {
	                delete options.agent;

	                var responseContentType = response.headers['content-type'];

	                switch (true) {
	                    case /application\/javascript/.test(responseContentType):
	                    case /application\/json/.test(responseContentType):
	                        console.log(util.inspect(body));
	                        // body = JSON.parse(body);
	                        break;
	                    case /application\/xml/.test(responseContentType):
	                    case /text\/xml/.test(responseContentType):
	                    default:
	                }

	                // Set Headers and Call
	                req.resultHeaders = response.headers;
	                req.call = url.parse(options.host + options.path);
	                req.call = url.format(req.call);

	                // Response body
	                req.result = body;

	                console.log(util.inspect(body));

	                next();
	            })
	        }).on('error', function(e) {
	                console.log('HEADERS: ' + JSON.stringify(res.headers));
	                console.log("Got error: " + e.message);
	                console.log("Error: " + util.inspect(e));
	        });
	
			if( options['method'] === 'POST') {
				var parms = { params: params };
				var str 	= JSON.stringify(parms);
				
				//console.log(str);
				apiCall.write(str);
			} 
	        apiCall.end();
	    }
	},
	
	index: function(req, res) {
		try {
		var d 		= discovery.current_schema();
		var apiName = d.name; 
		var apiInfo = {
			name: "Radarsat-2 API Browser",
			version: d.version,
			protocol: d.protocol,
			host: req.headers.host,
			basePath: d.basePath
		}
		var resources = d.resources;
		var endpoints = [];
		for( r in resources ) {
			//console.log("*** Resources: " + r);
			var methods = [];
			var resource_methods = resources[r]['methods'];
			for( rm in resource_methods ) {
				var method = {}
				method['MethodName'] 	= rm;
				method['HTTPMethod'] 	= resource_methods[rm]['httpMethod'];
				method['Synopsis'] 		= resource_methods[rm]['description'];
				method['URI'] 			= resource_methods[rm]['path'];
				method['MediaType']		= resource_methods[rm]['mediaType'] || "application/json";
				method['Accept']		= resource_methods[rm]['accept'] || "application/json";
				console.log(util.inspect(method));
				
				if( resource_methods[rm]['parameters']) {
					var parameters = [];
					for( p in resource_methods[rm]['parameters']) {
						var parm = resource_methods[rm]['parameters'][p];
						var np = {
							Name: 		p,
							Required: 	parm['required'],
							Default:    parm['default'],
							Type: 		parm['type'],
							Description:parm['description'],
							Enum: 		parm['enum'],
							Location:   parm['location']
						};
						parameters.push( np);
					}
					method['parameters']	= parameters;
				} else {
					var schema_name = resource_methods[rm]['request']['$ref'];
					console.log("schema name:"+schema_name);
				
					var schema = d.schemas[schema_name];
					var dparameters = schema['properties'];
					var parameters = [];
					for( p in dparameters) {
						var parm = dparameters[p];
						var np = {
							Name: 		p,
							Required: 	parm['required'],
							Default:    parm['default'],
							Type: 		parm['type'],
							Description:parm['description']
						};
						//console.log(util.inspect(parm));
						//console.log(util.inspect(np));
						parameters.push(np);
					}
				
					method['parameters']	= parameters;					
				}
				console.log("***Parameters:"+util.inspect(method['parameters']));
				
				method['read-only']		= false;
				
				//console.log(util.inspect(method));
				methods.push(method);
			} 
			var endpoint = {
				name: r,
				methods: methods
			};
			//console.log(util.inspect(endpoint))
			endpoints.push(endpoint);
		}
		
		var apiDefinition = {
			endpoints: 		endpoints,
			jsonSchemas: 	undefined
		}
		res.render('api/index.jade', {
			layout: 		'api_layout.jade',
			apiInfo: 		apiInfo,
			apiName: 		apiName,
			apiDefinition: 	apiDefinition,
			session: 		req.session
			})
	  } catch(e) {
		console.trace(e);
	  }
	}
}
