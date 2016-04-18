var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Stream = require('stream');

module.exports = function (server, conf) {

	const getCouchDBServer = function(servercodename){

		var couchserver;
		if(servercodename){
			couchserver = conf.dataproviders[servercodename];
		}else{
			couchserver = conf.dataproviders[conf.default.dataprovider];
		}

		if(!couchserver){
			throw new Error("Server not found in configuration " + servercodename);
		}

		var url = couchserver.hostname + "/" + couchserver.database;

		return url;

	}

	const uploadDocumentsDataProvider = function(docs){
		
		var alldocs = {};

		if(_.isArray(docs)){
			alldocs["docs"] = docs;
		}else if(_.isObject(docs)){
			alldocs["docs"] = [docs];
		}

        return new Promise(function(resolve, reject){
            var options = { 
                uri: getCouchDBServer() + "/_bulk_docs",
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
	    name: 'clusterprovider.uploadDocumentsDataProvider',
	    method: uploadDocumentsDataProvider,
	    options: {}
	});

	const getDocument = function(id){
		return new Promise(function(resolve, reject){
			try{
				var options = {
					uri: getCouchDBServer() + "/" + id
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
	    name: 'clusterprovider.getDocument',
	    method: getDocument,
	    options: {}
	});

	const deleteDocument = function(id, rev){
		return new Promise(function(resolve, reject){
			try{
				var options = {
					uri: getCouchDBServer() + "/" + id + "?rev=" + rev,
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
	    name: 'clusterprovider.deleteDocument',
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
	    name: 'clusterprovider.addDocumentAttachment',
	    method: addDocumentAttachment,
	    options: {}
	});

	const getDocumentURIAttachment = function(doc, name, remote){
		var uri;
		if(remote){
			if(remote.serverCodename){
				uri = getCouchDBServer(remote.serverCodename) + "/" + remote.uri;						
			}else{
				uri = remote.uri;
			}
			
		}else{
			uri = getCouchDBServer() + "/" + doc._id + "/" + name;
		}
		return {
			uri: uri
		};
	}

	server.method({
	    name: 'clusterprovider.getDocumentURIAttachment',
	    method: getDocumentURIAttachment,
	    options: {}
	});


	const getDocumentAttachment = function(doc, name, remote){
		return new Promise(function(resolve, reject){
			try{
				var options = server.methods.clusterprovider.getDocumentURIAttachment(doc, name, remote);
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
	    name: 'clusterprovider.getDocumentAttachment',
	    method: getDocumentAttachment,
	    options: {}
	});

	const getView = function(view){
		return new Promise(function(resolve, reject){
			try{
				var options = {
					uri: getCouchDBServer() + "/" + view
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
	    name: 'clusterprovider.getView',
	    method: getView,
	    options: {}
	});	
}
