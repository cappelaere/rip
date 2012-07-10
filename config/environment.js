var express = require('express'),
	cfg     = require('../lib/config');

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