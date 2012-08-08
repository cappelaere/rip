module.exports = {
  
	// service document
	index: function(req, res) {
		res.render("analytics/index.ejs", {layout:false});							
	},
};