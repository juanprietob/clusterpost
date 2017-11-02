var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var path = require('path');
var fs = require('fs');

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
            uri: exports.getCouchDBServer(codename) + "/_bulk_docs",
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
				uri: exports.getCouchDBServer(codename) + "/" + id
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
				uri: exports.getCouchDBServer(codename) + "/" + doc._id + "?rev=" + doc._rev,
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

		var conf;
		if(codename){
			conf = configuration[codename];
		}else{
			conf = configuration[configuration.default];
		}

		if(conf.datapath){
			var dirpath = path.join(conf.datapath, doc._id);
			if (!fs.existsSync(dirpath)){
				fs.mkdirSync(dirpath);
			}
			var dirpathfile=path.join(dirpath, name);
			if(path.dirname(name)!='.'){
				dirpath=path.join(dirpath, path.parse(name).dir);
				if (!fs.existsSync(dirpath)){
					fs.mkdirSync(dirpath);
				}
				dirpath=path.join(dirpath, path.parse(name).base);
				//var stats = fs.statSync(dirpath);
				// if(stats && stats.isFile()){
				// 	var sp=name.split('/');
				// 	name=sp[1];
				// 	console.log('name',name);
				// }else{
				// 	name='';
				// }
				
		    }
			
			var filepath = path.join(doc._id, name);
			var fullfilepath = dirpathfile;
			var writestream = fs.createWriteStream(fullfilepath);
			writestream.on('finish', function(err){

				if(!doc.attachments){
					doc.attachments = {};
				}

				doc.attachments[name] = {
		            "path": filepath
				}
				exports.uploadDocuments(doc)
				.then(function(res){
					resolve(res);
				})
				.catch(reject)

			})
			stream.pipe(writestream);
		}else{
			try{
				var options = {
					uri: exports.getCouchDBServer(codename) + "/" + doc._id + "/" + encodeURIComponent(name) + "?rev=" + doc._rev,
					method: 'PUT',
					headers: {
						"Content-type" : "application/octet-stream"
					}
				}
				console.log("!!!!!!!!!!!??????????",options.uri);
				stream.pipe(request(options, function(err, res, body){
					if(err){
						reject(err);
					}else{
						console.log(body);
						resolve(body);

					}
				}));
			}catch(e){
				reject(e);
			}
		}
		
	});
}


exports.addDocumentAttachmentFolder = function(doc, pathFolder, codename, rootFolder){
	
	
	//var stream = fs.createReadStream(testfile);
	var files=[];
	var file=[];
	files=fs.readdirSync(pathFolder);
	var base_folder = path.parse(pathFolder).base;
	rootFolder = rootFolder?  path.join(rootFolder, base_folder) : base_folder;
	var that = this;

	return Promise.map(fs.readdirSync(pathFolder), function(filename){
		var stats = fs.statSync(path.join(pathFolder,filename));
		if(stats && stats.isFile()){
			var stream = fs.createReadStream(path.join(pathFolder,filename));
			var namefile = path.join(rootFolder, filename);
			return that.addDocumentAttachment(doc, namefile, stream, codename)
			.then(function(res){
				if(_.isArray(res)){
					console.log(res);
					doc._rev=res[0].rev;
				}else{
					var result = JSON.parse(res);
					//console.log('result',result);
					doc._rev = result.rev;
				}	
				
			});
		}else if(stats && stats.isDirectory()){
			return that.addDocumentAttachmentFolder(doc, path.join(pathFolder, filename), codename, rootFolder);
			// .then(function(res){
			// 	return res;
			// })
		}else{
			return Promise.resolve();
		}
	},{concurrency: 1});

}
		



exports.getDocumentURIAttachment = function(doc, name, codename){

	codename = codename? codename: configuration.default;
	var conf = configuration[codename];
	var URI;
	if(doc._attachments){
		if(doc._attachments[name]!=null){
				URI=doc._id+'/'+name;
			return {

				uri: exports.getCouchDBServer(codename) + "/" + URI
								
				};
		}
	
	}
	if(doc.attachments){
		if(doc.attachments[name]!=null){
			return {
		 	"uri": exports.getCouchDBServer(codename) + "/" + doc._id,
		 	"onResponse": function(err, res, request, reply, settings, ttl){

		 		var filepath = path.join(conf.datapath, doc._id, name);
		 		var stream = fs.createReadStream(filepath);
		 		// stream.pipe(reply);
		 		reply(stream)
		 		}
			}
		}
	}

	 
}

exports.getDocumentAttachment = function(doc, name, codename){
	//TODO Check for attachment in document (attachments or _attachments)
	//call getDocumentAttachment
	//return file content
	var conf;
		if(codename){
			conf = configuration[codename];
		}else{
			conf = configuration[configuration.default];
		}
	var options = {
				uri: exports.getCouchDBServer(codename) + "/" + doc._id + "?rev=" + doc._rev
				
			}
	console.log("URI:   "+options.uri);
	if(doc.attachments){
		if(doc.attachments[name]!=null){
			return new Promise(function(resolve, reject){
				try{
					// console.log(conf.datapath);
					var pathattchment=path.join(conf.datapath,doc._id,name);
					console.log('path', pathattchment);
					var content=fs.readFileSync(pathattchment).toString();
					resolve(content);

				}catch(e){
					reject(e);
				}
			});
		}		
	}
	else if(doc._attachments){
		if(doc._attachments[name]!=null){
			return new Promise(function(resolve, reject){
				try{
				var options = getDocumentURIAttachment(options.uri, codename);
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
	}
	else{
		console.log("no attachment");
		return false;
	}

}

exports.getView = function(view, codename){
	return new Promise(function(resolve, reject){
		try{
			var options = {
				uri: exports.getCouchDBServer(codename) + "/" + view
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