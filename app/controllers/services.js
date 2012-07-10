var util		= require('util');
var path		= require('path');

module.exports = {

	index: function(req, res) {				
		console.log("services params:"+util.inspect(req.params))
		console.log("services query:"+util.inspect(req.query))
		res.render("services/index.jade");					
	},
	
	show: function(req, res) {
		var id = req.params['id'];
		res.render("services/show.jade");
	}
}