var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Stream = require('stream');
var Boom = require('Boom');

module.exports = function (server, conf) {

	const getCouchDBServer = function(servercodename){

		var couchserver;
		if(servercodename){
			couchserver = conf.dataproviders[servercodename];
		}else{
			couchserver = conf.dataproviders[conf.default.dataprovider];
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
                if(err) reject({"id" : "uploadDocumentsDataProvider", "message" : err.message});
                if(body.error) reject(body.error);

                resolve(body);
            });
        });
	}

	server.method({
	    name: 'clusterprovider.uploadDocumentsDataProvider',
	    method: uploadDocumentsDataProvider,
	    options: {}
	});

	const getDocument = function(id){
		var options = {
			uri: getCouchDBServer() + "/" + id
		}

		return new Promise(function(resolve, reject){
			request(options, function(err, res, body){
				if(err) reject(err);
				resolve(JSON.parse(body));
			});
		});
	}

	server.method({
	    name: 'clusterprovider.getDocument',
	    method: getDocument,
	    options: {}
	});

	const addDocumentAttachment = function(doc, name, stream){

		
		return new Promise(function(resolve, reject){

			var options = {
				uri: getCouchDBServer() + "/" + doc._id + "/" + name + "?rev=" + doc._rev,
				method: 'PUT'
			}

			stream.pipe(request(options, function(err, res, body){
				if(err) reject(err);
				resolve(body);
			}));
		});
	}

	server.method({
	    name: 'clusterprovider.addDocumentAttachment',
	    method: addDocumentAttachment,
	    options: {}
	});

	const getDocumentAttachment = function(doc, name){
		return new Promise(function(resolve, reject){

			var options = {
				uri: getCouchDBServer() + "/" + doc._id + "/" + name,
				encoding: null
			}
			request(options, function(err, res, body){
				if(err) reject(err);
				resolve(body);
			});
		});
		
	}

	server.method({
	    name: 'clusterprovider.getDocumentAttachment',
	    method: getDocumentAttachment,
	    options: {}
	});
}