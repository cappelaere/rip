var util		= require('util'),
	session		= require('../../app/controllers/session');

module.exports = {
	index: function(req, res) {
		var page = req.params['page'];
		if( page != undefined ) {
			res.render('docs/'+page+".ejs");					
		} else {
			res.render('docs/overview.ejs');					
		}
	}
}