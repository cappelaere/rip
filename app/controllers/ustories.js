var util			= require('util');
var path			= require('path');
var fs				= require('fs');
var debug			= require('debug')('ustories');
var crypto			= require('crypto');
var markdown		= require('markdown').markdown;
var eyes			= require('eyes');

// Check the User Stories TOC file
var stories_dir		= "./public/stories";
var toc_path		= path.join(stories_dir, "toc.md");
var toc_stats 		= fs.statSync(toc_path);
var toc_updated 	= toc_stats.mtime;
var toc_input 		= fs.readFileSync(toc_path, 'utf8');

var stories_tree 	= markdown.parse(toc_input);

var stories = [];

// Process the markdown table of contents
// and load a json structure easier to parse
function process_link( element ) {
	if( element[0] != 'link') throw "not a link"
	
	var href = element[1]['href'].replace(/#/,'/').replace(/_/,"/");
	
	var link = {		 
		'href': href,
		'key': 	element[2]
	}

	return link
}

function process_listitem( element ) {
	//console.log("process_listitem")
	//eyes.inspect(element)
	
	if( element[0] != 'listitem') throw "not a list item"
	
	if( typeof(element[1]) == 'string') {
		return {
			'key': element[1]
		}
	}

	var link = process_link( element[1] );
	
	if( element.length > 2 ) {	// we have sub-bullets
		var next = element[2];
		link.list = process_bulletlist( next )
	}
	return link;
}

function process_bulletlist(element) {
	//console.log("process_bulletlist")
	//eyes.inspect(element)
	
	if( element[0] != 'bulletlist') throw "Not a bullet list"
	element.shift();	// pop that element
	
	var list = [];
	for( el in element ) {
		list.push( process_listitem( element[el]))
	}
	return list;
}

function process_toc() {
	var bulletlist = stories_tree[2];

	// remove first element
	bulletlist.shift();
	
	for( var el in bulletlist ) {
		var element		= bulletlist[el];
		
		var item = {
			'key': element[1],
			'list':  process_bulletlist( element[2] )
		}
		stories.push( item )
	}
	//eyes.inspect(stories);
	
}

process_toc();

function find(h, q, fn) {
	var found = false;
	debug("**Find:"+q+" in:"+util.inspect(h));

	for( var k in h ) {
		var item 	= h[k];
		var key  	= item['key'];
		var href 	= item['href'];
		var list 	= item['list'];
		
		debug("key:"+key);
		if( q && q.indexOf(key)>=0 ) {
			// remove it from the string
			nq = q.replace(key,"").trim();
			// debug("nq length:"+nq.length+" nq:"+nq );
			if(nq.length > 0) {
				return find(list, nq, fn);
			} else {
				if( href ) {
					return fn(href)
				} else {
					debug("return anchor");
					found = true;
					return fn("/ustories#"+key);
				}
			}
		} 
	}
	
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
				var viewName = path.join("/ustories",link)
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

function htmlize(arr, indent ) {
	var str = "";
	for( var el in arr ) {
		var key 	= arr[el]['key'];
		var href 	= arr[el]['href'];
		var list	= arr[el]['list'];
		
		debug(key, href, list);
		
		if( !list ) {
			str += "<li><a href='"+ path.join("/ustories", href)+"'>"+key+"</a></li>\n";
		} else {
			str += "<li><a name='"+key+"'></a> <h"+indent+">"+key+"</h"+indent+">\n<ul>\n";
			indent++;
			str += htmlize(list, indent);
			indent--;
			str += "</ul></li>\n";
		}
		//debug("htmlize:%s - %s", k, str);
	}
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
		debug("ustories fmt:"+fmt);	
		var q = req.query['q'];
		if( q ) {
			debug("**** search q:"+q);

			search(req,res, function(viewName) {
				if( viewName ) {
					if( viewName.indexOf('#') >= 0 ) {
						debug("searchrender anchor:"+viewName)
						return res.redirect(viewName);
					} else {
						debug("search redirect to:"+viewName)
						return res.redirect(viewName);
					}
				} else {
					return res.send("Feature not found:"+q);
				}
			});
		} else {	// it is a toc
			var etag			= String(toc_input).sha1_hex();
			
			switch(fmt) {
				case 'html':
					var html	= htmlize(stories, 2);
					var type 	= "text/html";
					
					app.check_headers( req, res, etag, toc_updated, type, function() {
						return res.render("ustories/toc.ejs", {html: html });
					})
					break;				
				case 'json':
					var stories_list = {
						"kind":"rip:storiesList",
						"items": stories,
						"updated": updated,
						"selfLink": "/stories.json"
					}
					 
					stories_list['etag'] 	= etag;
					var type		 		= "application/json";	
					
					app.check_headers( req, res, etag, toc_updated, type, function() {
						return res.send(stories_list);
					})
					break;		
				case 'atom':
					return res.send(304);
			}
		}		
	},
	

	// Show a USer Story Markdown file
	//TODO cleanup when switching to Express 3.0
	show: function(req, res) {
		var cat = req.params['cat'];
		var id 	= req.params['id'];
		var id2 = req.params['id2'];
		
		var file = path.join(stories_dir, cat, id, id2);
		file += ".md"
		var input = String(fs.readFileSync(file, 'utf8'));

		var output 	= markdown.toHTML( input );
		output 		= String(output).replace(/&lt;/g, '<');	
		output 		= output.replace(/&gt;/g, '>').replace(/&quot;/g,"'");
	
		var stats 	= fs.statSync(file);
		var updated = stats.mtime;
		var etag  	= JSON.stringify(output).sha1_hex();
		var type 	= "text/html";
		
		app.check_headers( req, res, etag, updated, type, function() {
			res.render('ustories/show.jade', { body: output});			
		})
	}
}