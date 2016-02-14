
module.exports = function (conf) {

	var fs = require('fs');
	var request = require('request');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var path = require("path");
	var targz = require('tar.gz');
	var Joi = require('joi');


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
        	try{
        		var options = { 
	                uri: handler.getCouchDBServer() + "/_bulk_docs",
	                method: 'POST', 
	                json : alldocs
	            };
	            
	            request(options, function(err, res, body){
	                if(err) resolve(err);
	                resolve(body);
	            });
        	}catch(e){
        		reject(e);
        	}
            
        });
	}

	handler.getDocument = function(id){
		Joi.assert(id, Joi.string().alphanum());
		return new Promise(function(resolve, reject){
			try{
				var options = {
					uri: handler.getCouchDBServer() + "/" + id
				}
				request(options, function(err, res, body){
					if(err) resolve(err);
					resolve(JSON.parse(body));
				});
			}catch(e){
				reject(e);
			}
			
		});
	}

	handler.addDocumentAttachment = function(doc, name, stream){
		Joi.assert(doc._id, Joi.string().alphanum());
		Joi.assert(doc._rev, Joi.string());
		Joi.assert(name, Joi.string());
		
		return new Promise(function(resolve, reject){
			try{

				var options = {
					uri: handler.getCouchDBServer() + "/" + doc._id + "/" + name + "?rev=" + doc._rev,
					method: 'PUT',
					headers: {
						"Content-Type": "application/octet-stream"
					}
				}

				stream.pipe(request(options, function(err, res, body){
					if(err) resolve(err);
					resolve(JSON.parse(body));
				}));
			}catch(e){
				reject(e);
			}
		});
		
	}
	

	handler.savePromise = function(doc, cwd, input){

		return new Promise(function(resolve, reject){

			try{
				var options = {
					uri: handler.getCouchDBServer() + "/" + doc._id + "/" + input.name
				}

				var filepath = path.join(cwd, input.name);

				var writestream = fs.createWriteStream(filepath);
				request(options).pipe(writestream);

				writestream.on('close', function(err){
					if(err){
						resolve({
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
			}catch(e){
				reject(e);
			}

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

	handler.compressdirectory = function(doc, name){
		return new Promise(function(resolve, reject){
			var dirname = path.join(conf.storagedir, doc._id, name);
			var tarname = dirname+".tar.gz";

			try{
				var read = targz().createReadStream(dirname);
				var write = fs.createWriteStream(tarname);
				
				read.pipe(write);

				var allerror = "";
				write.stderr.on('data', function(data){
					allerror += data;
				});

				var alldata = "";
				write.stdout.on('data', function(data){
					alldata += data;
				});

				write.on('close', function(code){
					if(code) console.error(allerror);
					resolve(tarname);
				})

			}catch(e){
				reject(e);
			}
			
		});
	}

	handler.compressAndAddAttachment = function(doc, cwd, name){
		return handler.compressdirectory(doc, name)
		.then(function(compressedpath){
			var compressedname = path.basename(compressedpath);
			return handler.addDocumentAttachment(doc, compressedname, fs.createReadStream(compressedpath))
		});
	}

	const uploadAttachment = function(params){
		var doc = params.doc;
		var output = params.output;
		var cwd = params.cwd;

		var getlatestdoc = handler.getDocument(doc._id);

		if(output.type === 'file'){
			return getlatestdoc
			.then(function(latestdoc){
				return handler.addDocumentAttachment(latestdoc, output.name, fs.createReadStream(path.join(cwd, output.name)));
			});
			
		}else if(output.type === 'directory'){
			return getlatestdoc
			.then(function(latestdoc){
				return handler.compressAndAddAttachment(latestdoc, cwd, output.name);
			});
		}else{
			throw "Upload handler for " + output.type + "not available";
		}
	}

	handler.setAllDocumentOutputs = function(doc){
		var cwd = path.join(conf.storagedir, doc._id);
		var outputs = doc.outputs;

		var promparams = [];
		for(var i = 0; i < outputs.length; i++){
			promparams.push({
				doc: doc,
				output: outputs[i],
				cwd: cwd
			});
		}

		return Promise.map(promparams, uploadAttachment, {concurrency: 1});
	}

	const checkBeforeUpload = function(params){
		if(!params.ok){
			return uploadAttachment(params);
		}
		return params;
	}

	handler.checkAllDocumentOutputs = function(doc){
		var uploadstatus = doc.jobstatus.uploadstatus;
        var outputs = doc.outputs;
        var cwd = path.join(conf.storagedir, doc._id);

        var promparams = [];

        for(var i = 0; i < uploadstatus.length; i++){
            if(!uploadstatus[i].ok){
                promparams.push({
					doc: doc,
					output: outputs[i],
					cwd: cwd
				});
            }else{
            	promparams.push(uploadstatus[i]);
            }
        }

        return Promise.map(promparams, checkBeforeUpload, {concurrency: 1})
	}

	return handler;

}