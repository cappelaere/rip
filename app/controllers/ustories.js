var util		= require('util');
var path		= require('path');
var fs			= require('fs');
var debug		= require('debug')('ustories');
var crypto		= require('crypto');

var stories 	= JSON.parse(fs.readFileSync("./app/views/ustories/stories.json"));

function sha1_hex(s) {
    var hash = crypto.createHash('sha1');
    hash.update(s);
    return hash.digest('hex');
}

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
		var fmt = req.params['format'];
		if( fmt == undefined && req.query) fmt = req.query['format'];
		if( fmt == undefined && req.query) fmt = req.query['fmt'];
		if( fmt == undefined && req.query) fmt = req.query['alt'];
		if( fmt == undefined && req.query) fmt = req.query['output'];
		if( fmt == undefined) {
			var accept = req.headers.accept;
			if( accept ) {
				//console.log("Accept:"+util.inspect(accept))
				if( accept.indexOf('application/json') >= 0 ){
					fmt = 'json';
				} else if( 	accept.indexOf('atom') >= 0 ){
					fmt = 'atom';
				} else if( 	accept.indexOf('html') >= 0 ){
					fmt = 'html'
				} else if( 	accept.indexOf('*/*') >= 0 ){
					fmt = 'html'					
				} else {
					console.log("invalid accept header:"+accept)
					return res.send(406)
				}
			}
		}
		console.log("ustories fmt:"+fmt);	
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
			switch(fmt) {
				case 'html':
					var html = htmlize(stories, 2);
					return res.render("ustories/toc.ejs", {html: html });
				case 'json':
					var stories_list = {
						"kind":"rip:storiesList",
						"items": {},
						"updated": 0,
						"selfLink": "/stories.json"
					}
					 
					stories_list['etag'] = sha1_hex(JSON.stringify(stories_list));
					
					var if_none_match = req.headers["if-none-match"];
					var last_modified = req.headers["last-modified"];

					if( if_none_match && if_none_match==stories_list['etag'] ) {
						return res.send(304);
					}
			
					if( last_modified && last_modified==stories_list['updated']) {
						return res.send(304);
					}
					res.header('Content-Type','application/json');
					res.header('ETag', stories_list.etag);
					res.header('GData-Version', '2.0');
					
					return res.send(stories_list);
				case 'atom':
					return res.send(304);
			}
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