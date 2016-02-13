
module.exports = function (conf) {

	var fs = require('fs');
	var request = require('request');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var path = require("path");

	var handler = {};

	handler.getCouchDBServer = function(){

		var couchserver = conf.dataprovider;
		var url = couchserver.hostname + "/" + couchserver.database;
		return url;

	}


	handler.uploadDocumentsDataProvider = function(docs){
		
		var alldocs = {};

		if(_.isArray(docs)){
			alldocs["docs"] = docs;
		}else if(_.isObject(docs)){
			alldocs["docs"] = [docs];
		}

        return new Promise(function(resolve, reject){
            var options = { 
                uri: handler.getCouchDBServer() + "/_bulk_docs",
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

	handler.getDocument = function(id){
		var options = {
			uri: handler.getCouchDBServer() + "/" + id
		}

		return new Promise(function(resolve, reject){
			request(options, function(err, res, body){
				if(err) reject(err);
				resolve(JSON.parse(body));
			});
		});
	}

	handler.addDocumentAttachment = function(doc, name, data){
		
		return new Promise(function(resolve, reject){

			var options = {
				uri: handler.getCouchDBServer() + "/" + doc._id + "/" + name + "?rev=" + doc._rev,
				method: 'PUT'
			}

			var stream;
			if(data.pipe){
				stream = data;
			}else{
				stream = new Stream.Readable;
				stream.push(data);
				stream.push(0);
			}

			stream.pipe(request(options, function(err, res, body){
				if(err) reject(err);
				resolve(body);
			}));
		});
	}
	

	handler.savePromise = function(doc, cwd, input){

		return new Promise(function(resolve, reject){

			var options = {
				uri: handler.getCouchDBServer() + "/" + doc._id + "/" + input.name
			}

			var filepath = path.join(cwd, input.name);

			var writestream = fs.createWriteStream(filepath);
			request(options).pipe(writestream);

			writestream.on('close', function(err){
				if(err){
					reject({
						"path" : filepath,
						"status" : false,
						"err": err
					});
				} 
				resolve({
					"path" : filepath,
					"status" : true
				});
			});

		});
		
	}

	handler.getAllDocumentInputs = function(doc, cwd){
		var inputs = doc.inputs;
		var alldownloads = [];
		for(var i = 0; i < inputs.length; i++){
			var input = inputs[i];
			alldownloads.push(handler.savePromise(doc, cwd, input));
		}
		return Promise.all(alldownloads);
	}

	handler.createDirectoryCWD = function(doc){
		var cwd = path.join(conf.storagedir, doc._id);
		try{
			fs.mkdirSync(cwd);
		}catch(e){
			if(e.code !== 'EEXIST'){
				throw e;
			}
		}
		
		return cwd;
	}

	return handler;

}