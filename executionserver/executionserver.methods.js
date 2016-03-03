
module.exports = function (conf) {

	var fs = require('fs');
	var request = require('request');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var path = require("path");
	var targz = require('tar.gz');
	var Joi = require('joi');


	var handler = {};

	var transferitem = Joi.object().keys({
		path: Joi.string().required(), 
		status: Joi.boolean().required()
	});

	var parameter = Joi.object().keys({
		flag: Joi.string().allow(''),
      	name: Joi.string().allow('')
	});

	handler.Joijobstatus = Joi.object().keys({
			status: Joi.string().required(),
			jobid: Joi.string().valid('CREATE', 'DOWNLOADING', 'RUN', 'FAIL', 'KILL', 'UPLOADING', 'EXIT', 'DONE'),
			error: Joi.optional(),
			downloadstatus: Joi.object().optional(),
			uploadstatus: Joi.object().optional()
		});

	handler.Job = Joi.object().keys({
			_id: Joi.string().alphanum().required(),
			_rev: Joi.string().alphanum().required(),
			type: Joi.string().required(),
			userEmail: Joi.string().email().required(),
			timestamp: Joi.date().required(),
			jobstatus: handler.Joijobstatus.required(),
			executable: Joi.string().required(),
			executionserver: Joi.string().required(),
			jobparameters: Joi.optional(),
			parameters: Joi.array().items(parameter).min(1),			
			inputs: Joi.array().items(input).min(1),
			outputs: Joi.array().items(output).min(1),
			_attachments: Joi.optional()
	    });

	handler.getDataProvider = function(){

		var couchserver = conf.dataprovider;
		var url = couchserver.hostname;
		return url;

	}


	handler.uploadDocumentDataProvider = function(doc){

        return new Promise(function(resolve, reject){
        	try{
        		var options = { 
	                uri: handler.getDataProvider(),
	                method: 'PUT', 
	                json : doc
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
					uri: handler.getDataProvider() + "/" + id
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

	handler.addDocumentAttachment = function(doc, name, path){
		Joi.assert(doc._id, Joi.string().alphanum());
		Joi.assert(name, Joi.string());
		
		return new Promise(function(resolve, reject){
			try{

				var options = {
					uri: handler.getDataProvider() + "/" + doc._id + "/" + name,
					method: 'PUT',
					headers: {
						"Content-Type": "application/octet-stream"
					}
				}

				try{
					var fstat = fs.statSync(path);
					if(fstat){
						var stream = fs.createReadStream(path);

						stream.pipe(request(options, function(err, res, body){
							if(err) resolve(err);
							resolve(JSON.parse(body));
						}));
					}
				}catch(e){
					resolve({
						"error" : e
					});
				}
				
			}catch(e){
				reject(e);
			}
		});
		
	}
	

	handler.savePromise = function(doc, cwd, input){

		return new Promise(function(resolve, reject){

			try{
				var options = {
					uri: handler.getDataProvider() + "/" + doc._id + "/" + input.name
				}

				var filepath = path.join(cwd, input.name);

				var writestream = fs.createWriteStream(filepath);
				request(options, function(err, res, body){
					if(err || res.statusCode !== 200){
						resolve({
							"path" : filepath,
							"status" : false,
							"err": body
						});
					}
				}).pipe(writestream);

				writestream.on('close', function(err){
					if(err){
						resolve({
							"path" : filepath,
							"status" : false,
							"err": err
						});
					}else{
						resolve({
							"path" : filepath,
							"status" : true
						});
					}
				});
			}catch(e){
				reject(e);
			}

		});
		
	}

	handler.getAllDocumentInputs = function(doc, cwd){
		var inputs = doc.inputs;
		var alldownloads = [];
		var downloadstatus = [];

		for(var i = 0; i < inputs.length; i++){
			downloadstatus.push(false);
		}

		if(doc.jobstatus && doc.jobstatus.downloadstatus){
			var ds = doc.jobstatus.downloadstatus;
			for(var i = 0; i < ds.length; i++){
				if(ds[i].status){
					downloadstatus[i] = ds[i];
				}
			}
		}
		for(var i = 0; i < inputs.length; i++){
			var input = inputs[i];
			if(downloadstatus[i]){
				alldownloads.push(downloadstatus[i]);
			}else{
				alldownloads.push(handler.savePromise(doc, cwd, input));
			}
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
			var dirname;
			if(name === "cwd"){
				dirname = path.join(conf.storagedir, doc._id);
			}else{
				dirname = path.join(conf.storagedir, doc._id, name);
				if(dirname.substr(-1) === '/'){
					dirname = dirname.substr(0, dirname.length - 1);
				}
			}
			
			var tarname = dirname + ".tar.gz";

			try{
				var read = targz().createReadStream(dirname);
				var write = fs.createWriteStream(tarname);
				
				read.pipe(write);
				
				write.on('close', function(err){
					if(err) resolve({
						"error" : err
					})
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
			return handler.addDocumentAttachment(doc, compressedname, compressedpath)
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
				return handler.addDocumentAttachment(latestdoc, output.name, path.join(cwd, output.name));
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

        for(var i = 0; i < outputs.length; i++){
            if(!uploadstatus || !uploadstatus[i].ok){
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