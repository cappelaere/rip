// Publish the feed
// ping the pubsubhubbub with updated feed
//
var util		= require('util'),
	url 	 	= require('url'),
	querystring = require('querystring');
	
var publish 	= function( what ) {
	var urlstr 	= cfg.pubsubhubbub_url;
	var uri		= url.parse(urlstr);
	data 		= querystring.stringify({
		'hub.url': 		server_url+"/"+ cfg.root_service + what,
		'hub.mode': 	'publish'
	});
	
	var options = {
	  host: 	uri.host,
	  port: 	80,
	  path: 	uri.path,
	  method: 	'POST',
	  headers: {
	          'Content-Type': 'application/x-www-form-urlencoded',
	          'Content-Length': data.length
	  }
	};
	
	console.log("PSBH:"+data);
	
	var req = http.request(options, function(res) {
	  console.log('STATUS: ' + res.statusCode);
	  console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	    console.log('PSBH Response BODY: ' + chunk);
	  });
	});

	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});

	// write data to request body
	req.write(data);
	req.end();
}

// Hook into commonJS module systems
if (typeof module !== 'undefined' && "exports" in module) {
  module.exports.publish = publish;
}