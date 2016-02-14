
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
			var command = 'bsub';
			var parameters = doc.parameters;

			var params = [];

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


			params.push(doc.executable);
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

				"sample: Job <898104> is submitted to default queue <day>"
				runcommand.on('close', function(code){
					if(code){
						resolve({
							status: 'FAIL',
							error: allerror + alldata
						});
					}

					var ind = alldata.indexOf('<') + 1;
                    var jobid = alldata.substr(ind, alldata.indexOf('>') - ind);

					resolve({
						jobid : Number.parseInt(jobid),
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

				"sample success: 898104  jprieto DONE  day        killdevil-l donor_pool2 *gmail.com Feb 14 11:16"
				"sample fail: Job <8981> is not found"

				ps.on('close', function(code){

					if(alldata && alldata.indexOf('DONE') || alldata.indexOf('EXIT')){
						resolve({
							status: 'DONE',
							stat: alldata
						});
					}

					if(code || allerror){
						resolve({
							status: 'RUN',
							stat: allerror
						});						
					}

					resolve({
						status: 'RUN',
						stat: alldata
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

				const kill = spawn('bkill', params);

				var allerror = "";
				kill.stderr.on('data', function(data){
					allerror += data;
				});

				var alldata = "";
				kill.stdout.on('data', function(data){
					alldata += data;
				});

				kill.on('close', function(code){
					resolve({
						status: 'KILL',
						stat: allerror + alldata
					})
				});


			}catch(e){
				reject(e);
			}
			
		});

	}

	return handler;
}