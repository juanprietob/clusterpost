var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Boom = require('boom');
var spawn = require('child_process').spawn;
var couchUpdateViews = require('couch-update-views');
var path = require('path');
var qs = require('querystring');
var os = require('os');
var tarGzip = require('node-targz');
const { PassThrough, Writable } = require('stream');

module.exports = function (server, conf) {
	

	if(!server.methods.clusterprovider){
		throw new Error("Have you installed the 'couch-provider' plugin with namespace 'clusterprovider'?");
	}

	couchUpdateViews.migrateUp(server.methods.clusterprovider.getCouchDBServer(), path.join(__dirname, 'views'), true);

	var handler = {};
	/*
	*/
	handler.createJob = function(req, rep){
		
		var job = req.payload;
		job.timestamp = new Date();
		job.jobstatus = {
			status: 'CREATE'
		};		

		server.methods.clusterprovider.uploadDocuments(job)
		.then(function(res){
			if(res.length === 1){
				return res[0];
			}else{
				return res;
			}
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.badRequest(e));
		});
		
	}

	/*
	*/
	handler.updateJob = function(req, rep){

		var job = req.payload;
		var credentials = req.auth.credentials;

		var prom = [
			server.methods.clusterprovider.validateJobOwnership(job, credentials),
			server.methods.clusterprovider.getDocument(job._id)
			.then(function(doc){
				return server.methods.clusterprovider.validateJobOwnership(doc, credentials);
			})
			.catch(function(e){
				throw Boom.unauthorized("You are not allowed to update the document, it belongs to someone else");
			})
		]

		
		Promise.all(prom)
		.then(function(){
			return server.methods.clusterprovider.uploadDocuments(job);
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.wrap(e));
		});
	}

	/*
	*/
	handler.addData = function(req, rep){
		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.isJobDocument(doc);
		})
		.then(function(doc){
			return server.methods.clusterprovider.validateJobOwnership(doc, req.auth.credentials);
		})
		.then(function(doc){
			return server.methods.clusterprovider.addDocumentAttachment(doc, req.params.name, req.payload);
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.wrap(e));
		});
	}

	const getDocumentStreamAttachment = function(doc, name){
		
		var att = _.find(doc.inputs, function(input){
			return input.name === name;
		});
		if(!att){
			att = _.find(doc.outputs, function(output){
				return output.name === name;
			});
		}
		if(att){
			if(att.type === 'tar.gz'){
				name += ".tar.gz";
			}
			if(att.remote){
				var pass = new PassThrough();

				if(att.remote.serverCodename){

					request({
						uri: server.methods.clusterprovider.getCouchDBServer(att.remote.serverCodename) + "/" + att.remote.uri
					}).pipe(pass);

				}else{ //The next case is for the dataprovider-fs
					request({
						uri: att.remote.uri,
						agentOptions: {
							rejectUnauthorized: false
						}
					}).pipe(pass);
				}

				return pass;
			}else if(att.local){
				var pass = new PassThrough();

				request({
					uri: att.local.uri 
				}).pipe(pass);

				return pass;
			}
		}
		try{
			return server.methods.clusterprovider.getDocumentStreamAttachment(doc, name);
		}catch(e){
			throw Boom.notFound(e);
		}
		
	}

	/*
	*/
	handler.getJob = function(req, rep){

		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.validateJobOwnership(doc, req.auth.credentials);
		})
		.then(function(doc){
			if(req.params.name){
				var stream = getDocumentStreamAttachment(doc, req.params.name);
				rep(stream);
			}else{
				rep(doc);
			}
			
		})
		.catch(function(e){
			rep(Boom.notFound(e));
		});
		
	}

	handler.getDownloadToken = function(req, rep){

		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){			
			return server.methods.clusterprovider.validateJobOwnership(doc, req.auth.credentials);
		})
		.then(function(doc){

			var name = req.params.name;
			rep(server.methods.jwtauth.sign({ _id: doc._id, name: name }));
			
		})
		.catch(function(e){
			rep(Boom.wrap(e));
		});
	}

	handler.downloadAttachment = function(req, rep){
		var token = req.params.token;
		
		try{
			
			var decodedToken = server.methods.jwt.verify(token);
			
			server.methods.clusterprovider.getDocument(decodedToken._id)
			.then(function(doc){
				var stream = getDocumentStreamAttachment(doc, decodedToken.name);
				rep(stream);
			})
			.catch(function(e){
				rep(Boom.unauthorized(e));
			});
			
		}catch(e){
			rep(Boom.unauthorized(e));
		}
		
	}

	const jobDelete = function(doc){
		return server.methods.clusterprovider.getDocument(doc._id)
		.then(function(doc){
			return server.methods.clusterprovider.deleteDocument(doc);
		});
	}

	server.method({
	    name: 'dataprovider.jobDelete',
	    method: jobDelete,
	    options: {}
	});

	handler.deleteJob = function(req, rep){

		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.isJobDocument(doc);
		})
		.then(function(doc){
			return server.methods.clusterprovider.validateJobOwnership(doc, req.auth.credentials);
		})
		.then(function(doc){
			//The job is added to the delete queue. The actual deleation is done in the dataprovider.jobDelete function
			//After the job is deleted in the executionserver side, the deletion is done there.
			//The call to these functions is done in the cronprovider that manages the queues
			doc.jobstatus.status = "DELETE";
			return server.methods.clusterprovider.uploadDocuments(doc)
			.then(function(uploadstatus){
				return server.methods.cronprovider.addJobToDeleteQueue(doc);
			})
			.then(function(){
				return doc.jobstatus
			});
			
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.wrap(e));
		});
	}



	/*
	*/
	handler.getUserJobs = function(req, rep){

		var credentials = req.auth.credentials;
		var email = credentials.email;

		if(req.query.userEmail && email !== req.query.userEmail && credentials.scope.indexOf('admin') === -1){
			throw Boom.unauthorized("You are not allowed to view the jobs of other users.");
		}else if(req.query.userEmail){
			email = req.query.userEmail;
		}
		
		var jobstatus = req.query.jobstatus;
		var executable = req.query.executable;
		var executionserver = req.query.executionserver;
		var view;

		if(jobstatus && executable){
			var key = [email, jobstatus, executable];
			view = '_design/searchJob/_view/useremailjobstatusexecutable?include_docs=true&key=' + JSON.stringify(key);
		}else if(jobstatus && email){
			var key = [email, jobstatus];
			view = '_design/searchJob/_view/useremailjobstatus?include_docs=true&key=' + JSON.stringify(key);
		}else if(executable){
			var key = [email, executable];
			view = '_design/searchJob/_view/useremailexecutable?include_docs=true&key=' + JSON.stringify(key);
		}else if(executionserver){
			var key = {
				key: JSON.stringify([executionserver, jobstatus]),
				include_docs: true
			}
		    view = '_design/searchJob/_view/executionserverjobstatus?' + qs.stringify(key);		    
		}else{
			view = '_design/searchJob/_view/useremail?include_docs=true&key=' + JSON.stringify(email);
		}

		server.methods.clusterprovider.getView(view)
		.then(function(rows){
			return _.pluck(rows, 'doc');
		})
		.then(function(docs){
			return Promise.map(credentials.scope, function(sc){
				var key = {
					key: JSON.stringify(sc),
					include_docs: true
				}
				var v = '_design/searchJob/_view/scope?' + qs.stringify(key);					
				return server.methods.clusterprovider.getView(v)
				.then(function(rows){
					var scope_docs = _.pluck(rows, 'doc');
					if(executable){
						scope_docs = _.filter(scope_docs, function(doc){
							return doc.executable == executable;
						});
					}
					if(jobstatus){
						scope_docs = _.filter(scope_docs, function(doc){
							if(doc.jobstatus && doc.jobstatus.status){
								return doc.jobstatus.status == jobstatus;
							}
							return false;
						});
					}
					return scope_docs;
				});
			})
			.then(function(scope_docs){				
				return _.union(docs, scope_docs);
			})
			.then(function(res){				
				return _.uniq(_.compact(_.flatten(res)));
			});
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.wrap(e));
		})
	}

	/*
	*/

	handler.getAllJobs = function(req, rep){
		var executable = req.query.executable;

		if(executable){
			var key = executable;
			view = '_design/searchJob/_view/executable?include_docs=true&key=' + JSON.stringify(key);
		}else{
			view = '_design/searchJob/_view/executable?include_docs=true';
		}
		server.methods.clusterprovider.getView(view)
		.then(function(rows){
			return _.pluck(rows, 'doc');
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.wrap(e));
		});
	}

	const saveAttachment = function(stream, filename){

		return new Promise(function(resolve, reject){

			var writestream = fs.createWriteStream(filename);
            stream.pipe(writestream);

            writestream.on('finish', function(err){                 
                if(err){
                    reject({
                        "path" : filename,
                        "status" : false,
                        "error": err
                    });
                }else{
                    resolve({
                        "path" : filename,
                        "status" : true
                    });
                }
            });
		})
	}

	/*
	*/
	handler.getDownload = function(req, rep){
		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.validateJobOwnership(doc, req.auth.credentials);
		})
		.then(function(doc){

			try{
				
				var tempdir = path.join(os.tmpdir(), doc._id);
				fs.mkdirSync(tempdir);

				var outputs = doc.outputs;

				return Promise.map(outputs, function(output){
					return saveAttachment(getDocumentStreamAttachment(doc._id, output.name), output.name);
				})
				.then(function(){
					return new Promise(function(resolve, reject){
						var tarname = tempdir + ".tar.gz";
						tarGzip.compress({
						    source: tempdir,
						    destination: tarname
						}, function(){
							resolve(tarname);
						});
					});
				});

			}catch(e){
				rep(Boom.badImplementation(e));
			}
			
		})
		.then(function(tarname){
			try{
				if(fs.statFileSync(tarname)){
					rep.file(tarname);
				}
			}catch(e){
				throw Boom.badImplementation(e);
			}
		})
		.catch(function(e){
			rep(Boom.wrap(e));
		});
	}

	const deleteFolderRecursive = function(dir) {
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

	handler.deleteDownload = function(req, rep){
		
		try{
			var tempdir = path.join(os.tmpdir(), req.params.id);
			deleteFolderRecursive(tempdir);
			var tarfile = tempdir + ".tar.gz";
			if(fs.statSync(tarfile)){
				fs.unlinkSync(tarfile);
			}
		}catch(e){
			console.error(e);
		}
		rep(true);
	}

	return handler;
}
