var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Hapi = require('hapi');
var Boom = require('boom');
var spawn = require('child_process').spawn;

module.exports = function (server, conf) {
	

	var handler = {};

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
	/*
	*/
	handler.submitJob = function(req, rep){

		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			var executionserver = conf.executionservers[doc.executionserver];
			if(!executionserver){
				throw Boom.notFound("The server " + req.payload.executionserver + " is not configured.");
			}

			const submitjob = spawn('ssh', ['-q', '-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/submitjob.js", "-j", req.params.id]);

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
				}

				var view = "_design/getJob/_view/status?key=" + JSON.stringify(doc._id);
			    server.methods.clusterprovider.getView(view)
			    .then(function(docs){				    	
			    	rep(_.pluck(docs, "value")[0]);
			    })
			    .catch(function(e){
			    	rep(Boom.badRequest(e));
			    });
			});
		}).catch(function(e){
			rep(Boom.badRequest(e));
		});
	}

	handler.killJob = function(req, rep){
		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			var executionserver = conf.executionservers[doc.executionserver];
			if(!executionserver){
				throw Boom.notFound("The server " + req.payload.executionserver + " is not configured.");
			}

			const killjob = spawn('ssh', ['-q', '-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/killjob.js", "-j", req.params.id]);

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
			    	rep(Boom.badRequest(e));
			    });
			});

		}).catch(function(e){
			rep(Boom.badRequest(e));
		});
	}


	const jobstatus = function(doc){
		return new Promise(function(resolve, reject){
			try{
				var executionserver = conf.executionservers[doc.executionserver];
				const jobstatus = spawn('ssh', ['-q', '-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/jobstatus.js", "-j", doc._id]);

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
			return server.methods.executionserver.jobstatus(doc);
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.badRequest(e));
		})
		
	}

	return handler;

}