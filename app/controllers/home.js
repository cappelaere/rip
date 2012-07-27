
module.exports = {
  
	// service document
	index: function(req, res) {
		res.render("home/index.jade");							
	},
	
	about: function(req, res) {
		res.render("home/about.jade");
	}
};