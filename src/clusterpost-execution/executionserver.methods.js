
module.exports = function (conf) {

	var fs = require('fs');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var path = require("path");
	var tarGzip = require('node-targz');
	var Joi = require('@hapi/joi');
	var clustermodel = require('clusterpost-model');
	var clusterpost = require('clusterpost-lib');

	var agentOptions = {
		rejectUnauthorized: false
	}

	clusterpost.setClusterPostServer(conf.uri);
	clusterpost.setAgentOptions(agentOptions);
	clusterpost.setUserToken(conf.token);

	var handler = {};

	handler.getDataProvider = function(){

		var couchserver = conf.dataprovider;
		var url = couchserver.hostname;
		return url;

	}


	handler.uploadDocumentDataProvider = function(doc){
		return clusterpost.updateDocument(doc);
	}

	handler.getDocument = function(id){
		Joi.assert(id, Joi.string().alphanum());

		return clusterpost.getDocument(id)
		.then(function(job){
			Joi.assert(job, clustermodel.job);
			return job;
		});
	}

	handler.deleteDocument = function(doc){
		return clusterpost.deleteJob(doc._id);
	}

	//Read all files in directory and return an array with all files
	const getAllFiles = function(dir){
		return _.compact(_.flatten(_.map(fs.readdirSync(dir), (file)=>{
			var current = path.join(dir, file);
			try{
				var stat = fs.statSync(current);
				if (stat && stat.isDirectory()) {
					return getAllFiles(current);
				}else {
				    return current;
				}	
			}catch(e){
				console.error(e);
				return null;
			}
			
		})));
	}	

	handler.addDocumentDirectoryAttachment = function(doc, cwd, output){
		var dir = output.name;
		var allfiles = getAllFiles(path.join(cwd, dir));

		return Promise.map(allfiles, function(filename){
			var name = filename.replace(path.normalize(cwd) + path.sep, '');
			return handler.addDocumentAttachment(doc, filename, {...output, name});
		}, {concurrency: 1})
		.then(function(status){
			var ok = _.reduce(status, function(memo, s){ 
				return memo && (s.ok || s.statusCode == 409); 
			}, 
			true);

			return {
				name: dir,
				status: status,
				ok: ok
			}
		});
	}

	handler.addDocumentAttachment = function(doc, filename, output){
		Joi.assert(doc._id, Joi.string().alphanum());
		Joi.assert(filename, Joi.string());
		Joi.assert(output, clustermodel.output);

		if(output.local_storage){
			//This uploads the file to the local storage in the server
			var target_path;
			//We check if the target path is in the current filename, if is not, we don't add it again
			if(output.name.indexOf(output.local_storage.target_path) != -1){
				target_path = output.name
			}else{
				target_path = path.join(output.local_storage.target_path, output.name)
			}
			return clusterpost.uploadToStorage(filename, target_path)
		}else if(output.local){
			//Local output this assumes the disk is mounted in both the execution server and provider. i.e., there is no file transfer. 
			//Only links are generated
			if(conf.local_fs === undefined){
				return Promise.reject("No local_fs configuration in the execution server");
			}
			try{
				var local_path = output.local.useDefault? conf.local_fs[conf.local_fs.default].path : conf.local_fs[output.local.key].path
				var target_file = path.join(local_path, output.name);
				
				if(!fs.existsSync(target_file)){
					var target_dir = path.dirname(target_file);
					if(!fs.existsSync(target_dir)){
						fs.mkdirSync(target_dir, {recursive: true});
					}
					fs.renameSync(filename, target_file);
					fs.symlinkSync(target_file, filename);
				}
			}catch(e){
				return Promise.reject(e);
			}
			return Promise.resolve({
				ok: true
			});
		}else{
			return clusterpost.uploadFile(doc._id, filename, output.name);	
		}
	}

	handler.fileExists = function(cwd, input){
		try{
			return fs.existsSync(path.join(cwd, input.name));
		}catch(e){
			return false;
		}
	}
	

	handler.savePromise = function(doc, cwd, input){
		var inp = _.find(doc.inputs, function(inp){
			return inp.name === input.name;
		});

		if(!inp || (doc._attachments && !doc._attachments[input.name] && !inp.remote && !inp.local && !inp.local_storage)){
			return Promise.reject({					
				"status" : false,
				"error": "Document is missing attachment" + input.name
			});
		}else{
			if(inp.local_storage){
				return clusterpost.getFromStorage(path.join(cwd, input.name), input.name);
			}else if(inp && inp.local){
				if(conf.local_fs === undefined){
					throw "No local_fs configuration";
				}
				var local_path = inp.local.useDefault? conf.local_fs[conf.local_fs.default].path : conf.local_fs[inp.local.key].path
				var full_file_path = path.join(local_path, inp.name);

				if(fs.existsSync(full_file_path)){
					fs.mkdirSync(path.join(cwd, inp.name.replace(path.basename(inp.name), '')), {recursive: true})
					if(!fs.existsSync(path.join(cwd, inp.name))){
						fs.symlinkSync(full_file_path, path.join(cwd, inp.name));	
					}
					return Promise.resolve({
                        "path" : full_file_path,
                        "status" : true
                    });
				}else{
					return Promise.reject({
                        "path" : full_file_path,
                        "status" : false,
                        "error": "File not found!"
                    });
				}
			}else{ 
				return clusterpost.getDocumentAttachmentSave(doc._id, input.name, path.join(cwd, input.name));
			}
		}
	}


	handler.getAllDocumentInputs = function(doc, cwd){

		var inputs = doc.inputs;
		var alldownloads = [];
		var downloadstatus = [];

		if(!inputs){
			return Promise.all([]);
		}
		//Initialize download status to false
		for(var i = 0; i < inputs.length; i++){
			downloadstatus.push(false);
		}

		//Check for the jobstatus and downloadstatus part of the job
		//They are organized the same way as the array initialize in the previous step
		if(doc.jobstatus && doc.jobstatus.downloadstatus){
			var ds = doc.jobstatus.downloadstatus;
			for(var i = 0; i < ds.length; i++){
				if(ds[i].status){
					downloadstatus[i] = ds[i];
				}
			}
		}

		//If the download status is ok then don't download again. 
		for(var i = 0; i < inputs.length; i++){
			var input = inputs[i];
			if(downloadstatus[i] && handler.fileExists(cwd, input)){
				alldownloads.push(downloadstatus[i]);
			}else{				
				alldownloads.push(handler.savePromise(doc, cwd, input)
				.catch(function(e){
					console.error(e);
					return e;
				}));
			}
		}		
		return Promise.all(alldownloads);
	}

	handler.getDirectoryCWD = function(doc){
		return path.join(conf.storagedir, doc._id);
	}

	handler.createDirectoryCWD = function(doc){
		var cwd = handler.getDirectoryCWD(doc);
		try{
			fs.mkdirSync(cwd);
		}catch(e){
			if(e.code !== 'EEXIST'){
				throw e;
			}
		}
		
		return cwd;
	}

	handler.createOutputDirs = function(doc){
		var cwd = handler.getDirectoryCWD(doc);
		_.each(doc.outputs, (output)=>{
			if(output.type == "directory"){
				var target_dir = path.join(cwd, output.name);	
			}else{
				var target_dir = path.dirname(path.join(cwd, output.name));
			}
			
			if(!fs.existsSync(target_dir)){
				fs.mkdirSync(target_dir, {recursive: true});
			}
		});
	}

	handler.compressdirectory = function(doc, name){
		return new Promise(function(resolve, reject){
			var dirname;
			if(name === "cwd"){
				dirname = handler.getDirectoryCWD(doc);
			}else{
				dirname = path.join(handler.getDirectoryCWD(doc), name);
				if(dirname.substr(-1) === '/'){
					dirname = dirname.substr(0, dirname.length - 1);
				}
			}
			
			var tarname = dirname + ".tar.gz";

			var dirstat;
			try{
				dirstat = fs.statSync(dirname);
				if(dirstat){
					tarGzip.compress({
					    source: dirname,
					    destination: tarname
					}, function(){
						resolve(tarname);
					});
				}else{
					reject({
						"error": "Directory not found: " + dirname
					})
				}
				
			}catch(e){
				reject({
					"error": e
				});
			}
			
		});
	}

	handler.compressAndAddAttachment = function(doc, cwd, output){
		return handler.compressdirectory(doc, output.name)
		.then(function(compressedpath){
			output.name = path.basename(compressedpath);
			return handler.addDocumentAttachment(doc, compressedpath, output)
		})
		.catch(function(e){
			return e;
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
				var filepath = path.join(cwd, output.name);
				return handler.addDocumentAttachment(latestdoc, filepath, output);
			});
			
		}else if(output.type === 'tar.gz'){
			return getlatestdoc
			.then(function(latestdoc){
				return handler.compressAndAddAttachment(latestdoc, cwd, output);
			});
		}else if(output.type === 'directory'){
			return getlatestdoc
			.then(function(latestdoc){
				return handler.addDocumentDirectoryAttachment(latestdoc, cwd, output);
			});
		}else{
			throw "Upload handler for " + output.type + "not available";
		}
	}

	handler.setAllDocumentOutputs = function(doc){
		var cwd = handler.getDirectoryCWD(doc);
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
			return uploadAttachment(params)
			.catch(function(e){
				return e;
			});
		}
		return params;
	}

	handler.checkAllDocumentOutputs = function(doc){
		var uploadstatus = doc.jobstatus.uploadstatus;
        var outputs = doc.outputs;
        var cwd = handler.getDirectoryCWD(doc);

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

	handler.deleteFolderRecursive = function(dir) {
		var dirstat;
		try{
			dirstat = fs.statSync(dir);
		}catch(e){
			//does not exist
			dirstat = undefined;
		}
		if(dirstat){
			fs.readdirSync(dir).forEach(function(file) {
				var currentpath = path.join(dir, file);
				if(fs.statSync(currentpath).isDirectory()) {
					handler.deleteFolderRecursive(currentpath);
				}else{
					fs.unlinkSync(currentpath);
				}
			});
			fs.rmdirSync(dir);
			return true;
	    }
	    return false;
	}

	//One of
	//'CREATE', 'QUEUE', 'DOWNLOADING', 'RUN', 'FAIL', 'KILL', 'UPLOADING', 'EXIT', 'DONE'
	handler.getJobsStatus = function(status){
		if(conf.executionserver){
			return clusterpost.getExecutionServerJobs(conf.executionserver, status);
		}else{
			return Promise.reject("No executionserver in configuration.", JSON.stringify(conf), "Set the codename for the executionserver as 'executionserver: servername'");
		}
	}

	handler.getJobsQueue = function(){
		return handler.getJobsStatus("QUEUE")
	}

	handler.getJobsRun = function(){
		return handler.getJobsStatus("RUN");
	}

	handler.getJobsUploading = function(){
		return handler.getJobsStatus("UPLOADING");
	}

	handler.getJobsKill = function(){
		return handler.getJobsStatus("KILL");
	}

	handler.getJobsDelete = function(){
		return clusterpost.getDeleteQueue();
	}

	handler.getSoftware = function(id){
		return clusterpost.getSoftware(id)
	}

	handler.splitJobsGPU = function( all_jobs, softwares) {
// Return cpu and gpu jobs

	    var jobs =  _.filter(all_jobs, (job)=>{
	        var software = _.find(softwares, (s)=>{
	            if(job.data && job.data.software_id && job.data.software_id == s._id){
	                return true;
	            }
	            return false;
	        })
	        return !software.gpu;
	    })

	    var jobs_gpu = _.filter(all_jobs, (job)=>{
	        var software = _.find(softwares, (s)=>{
	            if(job.data && job.data.software_id && job.data.software_id == s._id){
	                return true;
	            }
	            return false;
	        })
	        return software.gpu;
	    })

	    return {
	        jobs,
	        jobs_gpu
	    }

	}

	return handler;

}
