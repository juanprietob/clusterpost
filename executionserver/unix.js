
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
				var out = fs.openSync(path.join(cwd, doc._id + ".out"), 'a');
		    	var err = fs.openSync(path.join(cwd, doc._id + ".err"), 'a');

				const runcommand = spawn(command, params, {
					cwd: cwd,
					detached: true,
					stdio: [ 'ignore', out, err ]
				});

				runcommand.unref();

				resolve({
					jobid : runcommand.pid,
					status: "RUN"
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
				var params = [jobid];

				const ps = spawn('ps', params);

				var allerror = "";
				ps.stderr.on('data', function(data){
					allerror += data;
				});

				var alldata = "";
				ps.stdout.on('data', function(data){
					alldata += data;
				});

				ps.on('close', function(code){
					var lines = alldata.split('\n');
					if(lines.length > 1){
						if(code && lines[1] === ''){
							resolve({
								status: 'DONE'
							});
						}else{
							//replace multiple space by single space and split by space;
							if(lines[1].indexOf(doc.executable) === -1){
								resolve({
									status: 'FAIL',
									error: 'The jobid does not match the running program'
								});
							}
							var l = lines[1].replace(/\s\s+/g, ' ').split(' ');
							resolve({
								status: 'RUN',
								stat: l[2],
								time: l[3]
							});
						}
					}else{
						resolve({
							status: 'FAIL',
							error: allerror
						});
					}
					
				});

			}catch(e){
				reject(e);
			}
			
		});
	}

	return handler;
}