
module.exports = function (conf) {

	var fs = require('fs');
	var request = require('request');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var path = require("path");
	var targz = require('tar.gz');
	var Joi = require('joi');


	var handler = {};

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
					if(err){
						reject(err);
					} 
					resolve(JSON.parse(body));
				});
			}catch(e){
				reject(e);
			}
			
		});
	}

	const getAllFiles = function(dir, files){		
		fs.readdirSync(dir).forEach(function(file) {	 
        	var current = path.join(dir, file);       	
			var stat = fs.statSync(current);
			if (stat && stat.isDirectory()) {
				getAllFiles(current, files);
			}else {
			    files.push(current);
			}
        });
	}	

	handler.addDocumentDirectoryAttachment = function(doc, cwd, dir){
		var allfiles = [];
		getAllFiles(path.join(cwd, dir), allfiles);

		return Promise.map(allfiles, function(file){
			var name = file.substr(cwd.length + 1);			
			return handler.addDocumentAttachment(doc, name, file);
		}, {concurrency: 1})
		.then(function(status){
			var ok = true;
			_.each(status, function(s){
				ok = ok&&s.ok;
			});
			return {
				name: dir,
				status: status,
				ok: ok
			}
		});
	}

	handler.addDocumentAttachment = function(doc, name, path){
		Joi.assert(doc._id, Joi.string().alphanum());
		Joi.assert(name, Joi.string());
		
		return new Promise(function(resolve, reject){
			try{

				var options = {
					uri: handler.getDataProvider() + "/" + doc._id + "/" + encodeURIComponent(name),
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
							if(err){								
								reject(err);
							}else{								
								resolve(JSON.parse(body));
							}
						}));
					}
				}catch(e){
					reject({
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

			if(!doc._attachments[input.name]){
				reject({					
					"status" : false,
					"error": "Document is missing attachment" + input.name
				});
			}

			try{
				var options = {
					uri: handler.getDataProvider() + "/" + doc._id + "/" + input.name
				}

				var filepath = path.join(cwd, input.name);

				var writestream = fs.createWriteStream(filepath);

				request(options).pipe(writestream);

				writestream.on('finish', function(err){					
					if(err){
						reject({
							"path" : filepath,
							"status" : false,
							"error": err
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
				alldownloads.push(handler.savePromise(doc, cwd, input)
					.catch(function(e){
						return e;
					}));
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
			
		}else if(output.type === 'tar.gz'){
			return getlatestdoc
			.then(function(latestdoc){
				return handler.compressAndAddAttachment(latestdoc, cwd, output.name);
			});
		}else if(output.type === 'directory'){
			return getlatestdoc
			.then(function(latestdoc){
				return handler.addDocumentDirectoryAttachment(latestdoc, cwd, output.name);
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
            if(!uploadstatus || !uploadstatus[i] || !uploadstatus[i].ok){
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