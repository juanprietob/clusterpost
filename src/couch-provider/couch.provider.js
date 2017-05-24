var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');

var configuration;

exports.setConfiguration = function(conf){
	if(!conf || !conf.default && !conf.hostname && !conf.database){
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
	configuration = conf;
}

exports.getCouchDBServer = function(codename){

	var couchserver;
	if(codename){
		couchserver = configuration[codename];
	}else if(configuration.default){
		couchserver = configuration[configuration.default];
	}else if(configuration.hostname && configuration.database){
		couchserver = configuration;
	}

	if(!couchserver){
		throw "No couchdb server found in configuration with " + codename;
	}

	var url = couchserver.hostname + "/" + couchserver.database;

	return url;

}

exports.uploadDocuments = function(docs, codename){
	
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


exports.getDocument = function(id, codename){
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
						reject(doc.error);
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

exports.deleteDocument = function(doc, codename){
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

exports.addDocumentAttachment = function(doc, name, stream, codename){
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


exports.getDocumentURIAttachment = function(uri, codename){
	return {
		uri: getCouchDBServer(codename) + "/" + uri
	};
}


exports.getDocumentAttachment = function(uri, codename){
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

exports.getView = function(view, codename){
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