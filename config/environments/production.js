var express = require('express');

app.configure('production', function() {
	console.log("configure production");
  	app.use(express.logger());
  	app.use(express.errorHandler());
  	app.enable('view cache');
  	app.enable('model cache');
  	app.enable('eval cache');
  	app.settings.quiet = true;
	
});

app_port = 1024;