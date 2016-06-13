var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Boom = require('boom');

module.exports = function (server, conf, namespace) {

	namespace = namespace !== undefined? namespace: "couchprovider";

	if(!conf.default){
		var confexample = {
			"default": "codename",
			"codename" : {
				"hostname" : "http://localhost:5984",
				"database" : "db"
			}
		}
		throw "No default database name, your conf should look like:\n" + JSON.stringify(confexample, null, 2);
	}

	const getCouchDBServer = function(codename){

		var couchserver;
		if(codename){
			couchserver = conf[codename];
		}else{
			couchserver = conf[conf.default];
		}

		if(!couchserver){
			throw new Error("Server not found in configuration " + codename);
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

	server.method({
	    name: namespace + '.uploadDocuments',
	    method: uploadDocuments,
	    options: {}
	});

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

	server.method({
	    name: namespace + '.getDocument',
	    method: getDocument,
	    options: {}
	});

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

	server.method({
	    name: namespace + '.deleteDocument',
	    method: deleteDocument,
	    options: {}
	});

	const addDocumentAttachment = function(doc, name, stream){
		return new Promise(function(resolve, reject){

			try{
				var options = {
					uri: getCouchDBServer() + "/" + doc._id + "/" + name + "?rev=" + doc._rev,
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

	server.method({
	    name: namespace + '.addDocumentAttachment',
	    method: addDocumentAttachment,
	    options: {}
	});

	const getDocumentURIAttachment = function(uri, codename){
		return {
			uri: getCouchDBServer(codename) + "/" + uri
		};
	}

	server.method({
	    name: namespace + '.getDocumentURIAttachment',
	    method: getDocumentURIAttachment,
	    options: {}
	});


	const getDocumentAttachment = function(uri, codename){
		return new Promise(function(resolve, reject){
			try{
				var options = server.methods.clusterprovider.getDocumentURIAttachment(uri, codename);
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

	server.method({
	    name: namespace + '.getDocumentAttachment',
	    method: getDocumentAttachment,
	    options: {}
	});

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

	server.method({
	    name: namespace + '.getView',
	    method: getView,
	    options: {}
	});

	console.info("Namespace created: ", namespace, "with couchdb server methods", server.methods[namespace], "And config: ", conf);
	
}
