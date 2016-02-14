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


		var executionserver = conf.executionservers[req.payload.executionserver];
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
			if(code !== 0){
				rep(allerror);
			}else{
				rep(alldata);
			}
		});
	}

	handler.jobStatus = function(req, rep){

		var executionserver = conf.executionservers[req.payload.executionserver];
		if(!executionserver){
			throw Boom.notFound("The server " + req.payload.executionserver + " is not configured.");
		}

		const submitjob = spawn('ssh', ['-i', executionserver.identityfile, executionserver.user + "@" + executionserver.hostname, "node", executionserver.sourcedir + "/updatejob.js", "-j", req.params.id]);

		var alldata = "";
		submitjob.stdout.on('data', function(data){
			alldata += data;
		});

		var allerror = "";
		submitjob.stderr.on('data', function(data){
			allerror += data;
		});

		submitjob.on('close', function(code){
			if(allerror !== ""){
				alldata += allerror;
			}
			rep(alldata);
		});
	}

	return handler;

}