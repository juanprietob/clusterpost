var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Boom = require('boom');
var spawn = require('child_process').spawn;
var fs = require('fs');
var os = require('os');
var path = require('path');

module.exports = function (server, conf) {
	

	var handler = {};

	const startExecutionServers = function(){
		return Promise.map(_.keys(conf.executionservers), function(eskey){
			return new Promise(function(resolve, reject){
				var token = server.methods.jwtauth.sign({ executionserver: eskey });
				var filename = path.join(os.tmpdir(), "." + eskey);
				fs.writeFile(filename, JSON.stringify(token), function(err){
					if(err){
						reject(err);
					}else{
						resolve(filename);
					}
				})
			})
			.then(function(filename){
				return new Promise(function(resolve, reject){
					var executionserver = conf.executionservers[eskey];
					var destination = path.join(executionserver.sourcedir, ".token");
					
					const scp = spawn('scp', ['-i', executionserver.identityfile, filename, executionserver.user + "@" + executionserver.hostname + ":" + destination ]);
					var alldata = "";
					scp.stdout.on('data', function(data){
						alldata += data;
					});

					var allerror = "";
					scp.stderr.on('data', function(data){
						allerror += data;
					});

					scp.on('close', function(code){
						if(code !== 0 || allerror !== ''){
							reject(Boom.badImplementation(allerror));
						}else{
							resolve(filename);
						}
					});
				});
			})
			.then(function(filename){
				fs.unlink(filename);
			})
			.catch(function(err){
				console.error(err);
			});
		});
	}

	server.method({
		name: "executionserver.startExecutionServers",
		method: startExecutionServers,
		options: {}
	});

	handler.getExecutionServers = function(req, rep){
		var executionservers = [];
		_.each(conf.executionservers, function(es, key){
			var obj = {
				name: key
			};
			if(es.queues){
				obj.queues = es.queues;
			}
			executionservers.push(obj);
		});
		rep(executionservers);
	}

	const getExecutionServer = function(key){
		return conf.executionservers[key];
	}

	server.method({
		name: 'executionserver.getExecutionServer',
		method: getExecutionServer,
		options: {}
	});
	/*
	*/
	handler.submitJob = function(req, rep){

		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.validateJobOwnership(doc, req.auth.credentials);
		})
		.then(function(doc){
			var executionserver = conf.executionservers[doc.executionserver];
			if(!executionserver){
				throw Boom.notFound("The server " + doc.executionserver + " is not configured.");
			}

			var params = ['-q', '-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/index.js", "-j", req.params.id, "--submit"];

			if(req.payload.force){
				params.push("-f");
			}

			const submitjob = spawn('ssh', params);

			var alldata = "";
			submitjob.stdout.on('data', function(data){
				alldata += data;
			});

			var allerror = "";
			submitjob.stderr.on('data', function(data){
				allerror += data;
			});

			submitjob.on('close', function(code){
				if(code !== 0 || allerror !== ''){
					console.error(allerror);
					console.log(alldata);
					rep(Boom.badImplementation(allerror));
				}else{
					var view = "_design/getJob/_view/status?key=" + JSON.stringify(doc._id);
				    server.methods.clusterprovider.getView(view)
				    .then(function(docs){				    	
				    	rep(_.pluck(docs, "value")[0]);
				    })
				    .catch(function(e){
				    	rep(Boom.badImplementation(e));
				    });
				}
			});
		}).catch(function(e){
			rep(Boom.badImplementation(e));
		});
	}

	handler.killJob = function(req, rep){
		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.validateJobOwnership(doc, req.auth.credentials);
		})
		.then(function(doc){
			var executionserver = conf.executionservers[doc.executionserver];
			if(!executionserver){
				throw Boom.notFound("The server " + doc.executionserver + " is not configured.");
			}

			const killjob = spawn('ssh', ['-q', '-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/index.js", "-j", req.params.id, "--kill"]);

			var alldata = "";
			killjob.stdout.on('data', function(data){
				alldata += data;
			});

			var allerror = "";
			killjob.stderr.on('data', function(data){
				allerror += data;
			});

			killjob.on('close', function(code){
				if(code !== 0 || allerror !== ''){
					console.error(allerror);
					console.log(alldata);
				}
				var view = "_design/getJob/_view/status?key=" + JSON.stringify(doc._id);
			    server.methods.clusterprovider.getView(view)
			    .then(function(docs){				    	
			    	rep(_.pluck(docs, "value")[0]);
			    })
			    .catch(function(e){
			    	rep(Boom.badImplementation(e));
			    });
			});

		}).catch(function(e){
			rep(Boom.badImplementation(e));
		});
	}


	const jobstatus = function(doc){
		return new Promise(function(resolve, reject){
			try{
				var executionserver = conf.executionservers[doc.executionserver];
				const jobstatus = spawn('ssh', ['-q', '-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/index.js", "-j", doc._id, "--status"]);

				var alldata = "";
				jobstatus.stdout.on('data', function(data){
					alldata += data;
				});

				var allerror = "";
				jobstatus.stderr.on('data', function(data){
					allerror += data;
				});

				jobstatus.on('close', function(code){
					if(allerror !== ""){
						alldata += allerror;
					}
					var view = "_design/getJob/_view/status?key=" + JSON.stringify(doc._id);
				    server.methods.clusterprovider.getView(view)
				    .then(function(docs){				    	
				    	resolve(_.pluck(docs, "value")[0]);
				    })
				    .catch(reject);
				});
			}catch(e){
				reject(e);
			}
		});
	}

	server.method({
	    name: 'executionserver.jobstatus',
	    method: jobstatus,
	    options: {}
	});

	handler.jobStatus = function(req, rep){

		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.validateJobOwnership(doc, req.auth.credentials);
		})
		.then(function(doc){
			return server.methods.executionserver.jobstatus(doc);
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.badRequest(e));
		})
		
	}

	const jobdelete = function(doc){
		return new Promise(function(resolve, reject){
			try{
				var executionserver = conf.executionservers[doc.executionserver];
				const jobdelete = spawn('ssh', ['-q', '-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/index.js", "-j", doc._id, "--delete"]);

				var alldata = "";
				jobdelete.stdout.on('data', function(data){
					alldata += data;
				});

				var allerror = "";
				jobdelete.stderr.on('data', function(data){
					allerror += data;
				});

				jobdelete.on('close', function(code){
					if(allerror !== ""){
						reject(Boom.badImplementation(allerror));
					}else{
						resolve(alldata);
					}
				});
			}catch(e){
				reject(e);
			}
		});
	}

	server.method({
	    name: 'executionserver.jobdelete',
	    method: jobdelete,
	    options: {}
	});

	return handler;

}