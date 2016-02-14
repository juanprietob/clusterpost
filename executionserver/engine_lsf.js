
module.exports = function (conf) {

	var fs = require('fs');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var spawn = require('child_process').spawn;
	var path = require('path');
	var Joi = require('joi');

	var executionmethods = require('./executionserver.methods')(conf);

	var handler = {};

	handler.submitJob = function(doc, cwd){

		Joi.assert(doc, executionmethods.Job);

		return new Promise(function(resolve, reject){
			var command = doc.executable;
			var parameters = doc.parameters;

			var params = [];

			var bsub = 'bsub';

			if(doc.jobparameters){
				params = doc.jobparameters;
			}

			params.push("-cwd");
			params.push(cwd);
			params.push("-e");
			params.push(path.join(cwd, doc._id + ".err"));
			params.push("-o");
			params.push(path.join(cwd, doc._id + ".out"));
			params.push("-u");
			params.push(doc.userEmail);
			params.push("-J");
			params.push(doc.userEmail);


			params.push(command);
			if(parameters){
				for(var i = 0; i < parameters.length; i++){
					var param = parameters[i];
					if(param.flag){
						params.push(param.flag);
					}
					if(param.name){
						params.push(param.name);
					}
				}
			}			

			try{
				const runcommand = spawn(command, params);

				var allerror = "";
				runcommand.stderr.on('data', function(data){
					allerror += data;
				});

				var alldata = "";
				runcommand.stdout.on('data', function(data){
					alldata += data;
				});

				runcommand.on('close', function(code){
					console.error(allerror);
					console.log(alldata);
					console.log(code);

					resolve({
						jobid : 1234,
						status: 'RUN'
					});
				});
				
			}catch(e){
				reject({
					status: "FAIL",
					error: e
				});
			}

		});
		
	}

	handler.getJobStatus = function(doc){

		Joi.assert(doc.jobstatus, executionmethods.Joijobstatus);

		return new Promise(function(resolve, reject){

			try{

				var jobid = doc.jobstatus.jobid;
				var params = ["-J", doc.userEmail, jobid];

				const ps = spawn('bjobs', params);

				var allerror = "";
				ps.stderr.on('data', function(data){
					allerror += data;
				});

				var alldata = "";
				ps.stdout.on('data', function(data){
					alldata += data;
				});

				ps.on('close', function(code){
					console.error(allerror);
					console.log(alldata);
					console.log(code);

					resolve({
						status: 'DONE'
					});
				});

			}catch(e){
				reject(e);
			}
			
		});
	}

	handler.killJob = function(doc){

		Joi.assert(doc.jobstatus, executionmethods.Joijobstatus);

		return new Promise(function(resolve, reject){

			try{

				var jobid = doc.jobstatus.jobid;
				var params = ["-J", doc.userEmail, jobid];

				const kill = spawn('kill', params);

				var allerror = "";
				kill.stderr.on('data', function(data){
					allerror += data;
				});

				var alldata = "";
				kill.stdout.on('data', function(data){
					alldata += data;
				});

				kill.on('close', function(code){
					console.error(allerror);
					console.log(alldata);
					console.log(code);
					resolve({
						status: 'KILL',
						stat: code
					})
				});


			}catch(e){
				reject(e);
			}
			
		});

	}

	return handler;
}