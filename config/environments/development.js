var express = require('express')

app.configure('development', function() {
	console.log("configure development");
  	app.use(express.logger());
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app_port=3000;