var express 	= require('express'),
	crypto		= require('crypto'),
	cfg     	= require('../lib/config'),
	markdown	= require("markdown");

app.configure(function(){
	console.log("configure...");
    var cwd = process.cwd();
    app.set('views', cwd + '/app/views');
    app.set('view engine', 'jade');

    app.enable('jsonp callback');
    app.set('jsonp callback', true);

    app.use(express.static(cwd + '/public'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	
    app.use(
		express.session({ 
			secret: 'OGC RIP',
			maxAge: new Date(Date.now()) + 7200000,
			store:  app.sessionStore
		}));
	
	app.use(app.router);
	  
	// Example 500 page
	app.error(function(err, req, res){
	    console.dir(err)
	    res.render('500', {status:500});
	});

	// Example 404 page via simple Connect middleware
	app.use(function(req, res){
	    res.render('404', {status:404});
	});  
});

Date.prototype.rfc339 =	function() {
 var pad = function (amount, width) {
  var padding = "";
  while (padding.length < width - 1 && amount < Math.pow(10, width - padding.length - 1))
   padding += "0";
  return padding + amount.toString();
 }
 date = this;	//date ? date : new Date();
 var offset = date.getTimezoneOffset();
 console.log("rfc339 offset:"+ offset);
 return pad(date.getFullYear(), 4)
   + "-" + pad(date.getMonth() + 1, 2)
   + "-" + pad(date.getDate(), 2)
   + "T" + pad(date.getHours(), 2)
   + ":" + pad(date.getMinutes(), 2)
   + ":" + pad(date.getSeconds(), 2)
   + "." + pad(date.getMilliseconds(), 3)
   + (offset > 0 ? "-" : "+")
   + pad(Math.floor(Math.abs(offset) / 60), 2)
   + ":" + pad(Math.abs(offset) % 60, 2);
}

var http = require('http')
  , req = http.IncomingMessage.prototype

req.fmt = function() {
	var fmt = this.param('format');
	if( fmt == undefined && this.query) fmt = this.query['format'];
	if( fmt == undefined && this.query) fmt = this.query['fmt'];
	if( fmt == undefined && this.query) fmt = this.query['alt'];
	if( fmt == undefined && this.query) fmt = this.query['output'];
	if( fmt == undefined) {
		var accept = this.headers.accept;
		if( accept ) {
			//console.log("Accept:"+util.inspect(accept))
			if( accept.indexOf('json') >= 0 ){
				fmt = 'json';
			} else if( 	accept.indexOf('atom') >= 0 ){
				fmt = 'atom';
			} else if( 	accept.indexOf('html') >= 0 ){
				fmt = 'html'
			} else if( 	accept.indexOf('*/*') >= 0 ){
				fmt = 'html'					
			}
		}
	}	
	return fmt;
}

String.prototype.sha1_hex = function() {
	var s = this;
    var hash = crypto.createHash('sha1');
    hash.update(String(s));
    return hash.digest('hex');
}