var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Hapi = require('hapi');
var Boom = require('boom');
var spawn = require('child_process').spawn;

module.exports = function (server, conf) {
	

	var handler = {};

	handler.getExecutionServers = function(req, rep){
		rep(_.keys(conf.executionservers));
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

			const submitjob = spawn('ssh', ['-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/submitjob.js", "-j", req.params.id]);

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
					rep(allerror);
				}else{
					rep(alldata);
				}
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

			const killjob = spawn('ssh', ['-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/killjob.js", "-j", req.params.id]);

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
					rep(allerror);
				}else{
					rep(alldata);
				}
			});

		}).catch(function(e){
			rep(Boom.badRequest(e));
		});
	}

	handler.jobStatus = function(req, rep){

		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			var executionserver = conf.executionservers[doc.executionserver];
			if(!executionserver){
				throw Boom.notFound("The server " + req.payload.executionserver + " is not configured.");
			}

			const jobstatus = spawn('ssh', ['-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/jobStatus.js", "-j", req.params.id]);

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
				rep(alldata);
			});
		})
		.catch(function(e){
			rep(Boom.badRequest(e));
		})
		
	}

	return handler;

}