var express = require('express')

app.configure('development', function() {
	console.log("configure development");
  	app.use(express.logger());
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app_port=3000;

// create some users for testing in development mode
//console.log(__dirname+ '/../users.json');

var userdb = JSON.parse(require('fs').readFileSync(__dirname + '/../users.json', 'utf-8'));
for( var u in userdb ) {
 	var user 	 = new User( userdb[u].nickname, userdb[u].fullname, userdb[u].email, userdb[u].openid, 
		userdb[u].credential, userdb[u].permissions, userdb[u].licenses_accepted );
	user.save( function(err){
		//console.log("Created user:"+user.nickname);
	});
}