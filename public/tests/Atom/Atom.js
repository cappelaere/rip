var util 			= require('util');
var request			= require('superagent');
var async			= require('async');
var _				= require('underscore');
var cheerio			= require('cheerio');
var chai			= require('chai');
var should			= require('chai').should();
var AssertionError	= chai.AssertionError;
var debug 			= require('debug')('tests:Atom');

function NamedTag(arr, tag) {
	var array = arr.children().toArray();
	
	var result = _.find(array, function(elem) {
		if( elem.name == tag ) {
			return true
		}
	})
	return result;
}

describe('Atom Feeds', function() {
	var atom_urls 	= [];
	var feeds 	= [];
	
	before( function(done) {

		// we need to filter out the templated urls 
		atom_urls = _.map(resources_urls, function(url) {
			var path = url['path'];
			return path.replace(".{fmt}", "")
		})
		done();
	})

	describe('are available for lists of resources', function() {
		it( 'should support application/atom+xml Accept header and return application/atom+xml Content-type', function(done) {
			if( atom_urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});

			async.forEachSeries( atom_urls, function( u, callback ) {	
				request
				.head(u)
				.set('Accept', 'application/atom+xml')
				.end( function(res) {
					try {
						res.status.should.equal(200)
						res.type.should.contain('application/atom+xml')
						callback();
					} catch(e) {
						callback(u+" "+e)
					}
				})
			}, function(err) { 
				if( err ) throw new AssertionError({'message': err});
				done(); 
			});
		})

		it( 'should be valid Atom feeds', function(done) {
			if( atom_urls.length == 0 ) throw new AssertionError({'message': "No URLs to check"});

			async.forEachSeries( atom_urls, function( u, callback ) {	
				request
				.get(u)
				.set('Accept', 'application/atom+xml')
				.end( function(res) {
					try {
						debug("Atom get:"+u)				
						res.status.should.equal(200)
						res.type.should.contain('application/atom+xml')
					
						var doc 	= cheerio.load(res.text, { ignoreWhitespace: true, xmlMode: true })
						var feed 	= doc('feed');
						
						feed.find('title').length.should.not.equal(0);
						feed.find('id').length.should.not.equal(0);
						feed.find('updated').length.should.not.equal(0);
						feed.find('author').length.should.not.equal(0);

						var entry = feed.find('entry');
						//console.log("*found entry:"+util.inspect(entry))
						var f = {
							'url': u,
							'doc': doc,
							'entry': entry
						}
						feeds.push(f);
						
						callback();
					} catch(e) {
						callback(u+" "+e)
					}
				})
			}, function(err) { 
				if( err ) throw new AssertionError({'message': err});
				done(); 
			});
		})
		
		it( 'should be published to one or more aggregators', function(done) {
			async.forEachSeries( feeds, function( e, callback ) {
				// check aggregator links
				e.doc('feed').find('link[rel=hub]').length.should.not.equal(0);
				callback(null);
			}, function(err) {
				if( err ) throw new AssertionError({'message': e.url+" " +err});
				
				done()
			});
		})
	})
	
	describe("may be extended", function() {
		if( params['AtomExtension'] == 'GData2') {
			//require(__dirname+'/GData2.js')
			describe('are extended using GData 2.0 protocol', function() {
				it("feed uses etag attribute", function(done) {
					async.forEachSeries( feeds, function( e, callback ) {
						var etag = e.doc('feed').attr('gd:etag');
						should.exist(etag);
						callback(null);
					}, function(err) {
						done();
					})
				})	

				it("feed use category and proper accessible schema", function(done) {
					async.forEachSeries( feeds, function( e, callback ) {
						var category = e.doc('feed').find('category');
						should.exist(category);
						var scheme = category.attr('scheme')
						should.exist(scheme);
						debug("scheme:"+util.inspect(scheme))
						// check schema availability
						request
							.get(scheme)
							.end( function(res) {
									res.status.should.equal(200);
									callback(null);
								});									
						//callback();	
					}, function(err) {
						done();
					})
				})
				
				it("feed use OpenSearch namespace and attributes", function(done) {
					async.forEachSeries( feeds, function( e, callback ) {
				
						var feed = e.doc('feed')

						NamedTag(feed, "openSearch:totalResults").should.exist;
						NamedTag(feed, "openSearch:startIndex").should.exist;
						NamedTag(feed, "openSearch:itemsPerPage").should.exist;
					
						callback(null);
					}, function(err) {
						done();
					})
				})
				
				it("entries use etag attribute", function(done) {
					async.forEachSeries( feeds, function( e, callback ) {
						if( e.entry && e.entry.length>0 ) {
							var etag = e.entry[0].attribs['gd:etag'];
							should.exist(etag);
						}
						callback(null);
					}, function(err) {
						done();
					})
				})	

				it("entries use category tag and proper accessible schema", function(done) {
					async.forEachSeries( feeds, function( e, callback ) {
						if( e.entry && e.entry.length>0 ) {
							var category = e.entry.find('category');
							should.exist(category);
							var scheme = category.attr('scheme')
							should.exist(scheme);
							debug("entry scheme:"+scheme)
							request
								.get(scheme)
								.end( function(res) {
										res.status.should.equal(200);
										callback(null);
									});
						} else {
							callback(null);
						}
					}, function(err) {
						done();
					})
				})	
				
			})
		}
	})
})
