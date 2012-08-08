var util		= require('util');
var path		= require('path');
var fs			= require('fs');
var debug		= require('debug')('ustories');;

var stories 	= JSON.parse(fs.readFileSync("./app/views/ustories/stories.json"));

function find(h, q, fn) {
	var found = false;
	debug("**Find:"+q+" in:"+util.inspect(h));
//	Object.keys(h).forEach( function(k,v) {
	for( var k in h ) {
		var v = h[k];
		
		debug("k:"+k);
		if( q && q.indexOf(k)>=0 ) {
			// remove it from the string
			nq = q.replace(k,"").trim();
			debug("nq length:"+nq.length+" nq:"+nq + " in:"+util.inspect(h[k]));
			if(nq.length>0) {
				return find(h[k], nq, fn);
			} else {
				var next = h[k];
				if( next["link"] ) {
					return find(h[k], nq, fn)
				} else {
					debug("return anchor");
					found = true;
					return fn("/ustories#"+k);
				}
			}
		} else if( k.indexOf("link") >= 0 ) {
			var link = h["link"];
			if( link) {
				var href = link["href"];
				found = true;
				return fn(href);
			}
		}
	};
	
	if( ! found ) {
		debug("Not found:");
		fn(null);
	}
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
		//debug("htmlize:%s - %s", k, str);
	});
	return str;
}

module.exports = {
	index: function(req, res) {				
		var q = req.query['q'];
		if( q ) {
			debug("**** search q:"+q);

			search(req,res, function(viewName) {
				debug("** search returned:"+viewName)
				if( viewName ) {
					if( viewName.indexOf('#') < 0 ) {
						console.log("render:"+viewName)
						return res.render(viewName);
					} else {
						console.log("render:"+viewName)
						return res.redirect(viewName);
					}
				} else {
					return res.send("Feature not found:"+q);
				}
			});
		} else {	// it is a toc
			var html = htmlize(stories, 2);
			return res.render("ustories/toc.ejs", {html: html });
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