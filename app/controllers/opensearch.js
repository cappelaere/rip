var util = require('util');

module.exports = {
  
	// lists all processes in various formats
	index: function(req, res) {
		var file = req.params['id'];
		//console.log("opensearch "+file);
		res.contentType('application/xml');
		var host = "http://"+req.headers.host;
		//console.log("Host set to:"+host);
		res.render("opensearch/"+file+".ejs", {layout:false, host:host});
	}
}