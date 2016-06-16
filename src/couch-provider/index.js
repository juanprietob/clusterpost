var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Boom = require('boom');

module.exports = function (conf, server, namespace) {
	
	if(!conf.default && !conf.hostname && !conf.database){
		var confexample = {
			"default": "codename",
			"codename" : {
				"hostname" : "http://localhost:5984",
				"database" : "db"
			}
		}
		console.error("No default database name, your conf should look like:", JSON.stringify(confexample, null, 2), "or", JSON.stringify(confexample.codename, null, 2))
		throw "Bad couchdb configuration";
	}

	const getCouchDBServer = function(codename){

		var couchserver;
		if(codename){
			couchserver = conf[codename];
		}else if(conf.default){
			couchserver = conf[conf.default];
		}else if(conf.hostname && conf.database){
			couchserver = conf;
		}

		if(!couchserver){
			throw Boom.notFound("No couchdb server found in configuration", [codename, conf]);
		}

		var url = couchserver.hostname + "/" + couchserver.database;

		return url;

	}

	const uploadDocuments = function(docs, codename){
		
		var alldocs = {};

		if(_.isArray(docs)){
			alldocs["docs"] = docs;
		}else if(_.isObject(docs)){
			alldocs["docs"] = [docs];
		}

        return new Promise(function(resolve, reject){
            var options = { 
                uri: getCouchDBServer(codename) + "/_bulk_docs",
                method: 'POST', 
                json : alldocs
            };
            
            request(options, function(err, res, body){

                if(err){
                	reject({"id" : "uploadDocumentsDataProvider", "message" : err.message});
                }else if(body.error){
                	reject(body.error);
                }else{
                	resolve(body);
                }
            });
        });
	}
	

	const getDocument = function(id, codename){
		return new Promise(function(resolve, reject){
			try{
				var options = {
					uri: getCouchDBServer(codename) + "/" + id
				}
				request(options, function(err, res, body){
					if(err){
						reject(err);
					}else{
						var doc = JSON.parse(body);
						if(doc.error){
							reject(Boom.notFound(doc));
						}else{
							resolve(doc);
						}
					}
				});

			}catch(e){
				reject(e);
			}
		});
	}

	const deleteDocument = function(doc, codename){
		return new Promise(function(resolve, reject){
			try{
				var options = {
					uri: getCouchDBServer(codename) + "/" + doc._id + "?rev=" + doc._rev,
					method: 'DELETE'
				}				
				request(options, function(err, res, body){
					if(err){
						reject(err);
					}else{
						var doc = JSON.parse(body);
						if(doc.error){
							reject(doc);
						}else{
							resolve(doc);
						}
					}
				});

			}catch(e){
				reject(e);
			}
		});
	}

	const addDocumentAttachment = function(doc, name, stream, codename){
		return new Promise(function(resolve, reject){

			try{
				var options = {
					uri: getCouchDBServer(codename) + "/" + doc._id + "/" + name + "?rev=" + doc._rev,
					method: 'PUT',
					headers: {
						"Content-type" : "application/octet-stream"
					}
				}

				stream.pipe(request(options, function(err, res, body){
					if(err){
						reject(err);
					}else{
						resolve(body);
					}
				}));
			}catch(e){
				reject(e);
			}
		});
	}


	const getDocumentURIAttachment = function(uri, codename){
		return {
			uri: getCouchDBServer(codename) + "/" + uri
		};
	}


	const getDocumentAttachment = function(uri, codename){
		return new Promise(function(resolve, reject){
			try{
				var options = getDocumentURIAttachment(uri, codename);
				request(options, function(err, res, body){
					if(err){
						reject(err);
					}else{
						resolve(body);
					}
				});
			}catch(e){
				reject(e);
			}
			
		});
		
	}

	const getView = function(view, codename){
		return new Promise(function(resolve, reject){
			try{
				var options = {
					uri: getCouchDBServer(codename) + "/" + view
				}

				request(options, function(err, res, body){					
					if(err){						
						reject(err);
					}else{
						var docs = JSON.parse(body);
						resolve(docs.rows);
					}					
				});
			}catch(e){
				reject(e);
			}
		})
	}

	if(server && namespace){

		server.method({
		    name: namespace + '.getCouchDBServer',
		    method: getCouchDBServer,
		    options: {}
		});

		server.method({
		    name: namespace + '.uploadDocuments',
		    method: uploadDocuments,
		    options: {}
		});

		server.method({
		    name: namespace + '.getDocument',
		    method: getDocument,
		    options: {}
		});

		server.method({
		    name: namespace + '.deleteDocument',
		    method: deleteDocument,
		    options: {}
		});
		
		server.method({
		    name: namespace + '.addDocumentAttachment',
		    method: addDocumentAttachment,
		    options: {}
		});

		server.method({
		    name: namespace + '.getDocumentURIAttachment',
		    method: getDocumentURIAttachment,
		    options: {}
		});

		server.method({
		    name: namespace + '.getDocumentAttachment',
		    method: getDocumentAttachment,
		    options: {}
		});

		server.method({
		    name: namespace + '.getView',
		    method: getView,
		    options: {}
		});

		console.info('couch-provider namespace', namespace, 'initialized.');
	}else{
		return {
			getCouchDBServer: getCouchDBServer,
			uploadDocuments: uploadDocuments,
			getDocument: getDocument,
			deleteDocument: deleteDocument,
			addDocumentAttachment: addDocumentAttachment,
			getDocumentURIAttachment: getDocumentURIAttachment,
			getDocumentAttachment: getDocumentAttachment,
			getView: getView
		}
	}
	
}
