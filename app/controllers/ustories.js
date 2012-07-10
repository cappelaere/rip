var util		= require('util');
var path		= require('path');
var fs			= require('fs');
var debug		= require('debug')('ustories');;

var stories 	= JSON.parse(fs.readFileSync("./app/views/ustories/stories.json"));

function find(h, q, fn) {
	debug("**Find:"+q+" in:"+util.inspect(h));
	Object.keys(h).forEach( function(k,v) {
		debug("k:"+k);
		if( q && q.indexOf(k)>=0 ) {
			// remove it from the string
			nq = q.replace(k,"").trim();
			debug("nq length:"+nq.length+" nq:"+nq + " in:"+util.inspect(h[k]));
			if(nq.length>0) {
				find(h[k], nq, fn);
			} else {
				var next = h[k];
				if( next["link"] ) {
					find(h[k], nq, fn)
				} else {
					debug("return anchor");
					fn("/ustories#"+k);
				}
			}
		} else if( k.indexOf("link") >= 0 ) {
			var link = h["link"];
			if( link) {
				var href = link["href"];
				fn(href);
			}
		}
	});
}

function search( req, res, fn) {
	var q = req.query['q'];
	find(stories, q, function(link) {
		if( link ) {
			if( link.indexOf('#') < 0 ) {
				var viewName = path.join("ustories",link+".jade")
				debug("link:"+link+" to:"+viewName);
				fn(viewName);	
			} else {
				debug("anchor:"+link);
				fn(link);
			}
		} else {
			fn(null);				
		}
	})
}

function htmlize(h, indent ) {
	var str = "";
	Object.keys(h).forEach( function(k,v) {
		var nexth = h[k];
		if( nexth['link'] ) {
			var link = nexth['link'];
			var href = link['href'];
			str += "<li><a href='"+ path.join("ustories", href)+"'>"+k+"</a></li>\n";
		} else {
			str += "<li><a name='"+k+"'></a> <h"+indent+">"+k+"</h"+indent+">\n<ul>\n";
			indent++;
			str += htmlize(nexth, indent);
			indent--;
			str += "</ul></li>\n";
		}
		debug("htmlize:%s - %s", k, str);
	});
	return str;
}

module.exports = {
	index: function(req, res) {				
		var q = req.query['q'];
		if( q ) {
			debug("search q:"+q);
			search(req,res, function(viewName) {
				if( viewName ) {
					if( viewName.indexOf('#') < 0 ) {
						return res.render(viewName);
					} else {
						res.redirect(viewName);
					}
				} else {
					res.send("Feature not found:"+q);
				}
			});
		} else {	// it is a toc
			var html = htmlize(stories, 2);
			res.render("ustories/toc.ejs", {html: html });
		}		
	},
	
	
	show: function(req, res) {
		var cat = req.params['cat'];
		var id = req.params['id'];
		var id2 = req.params['id2'];
		
		var file = path.join("ustories",cat, id, id2);
		res.render(file+".jade");
	}
}