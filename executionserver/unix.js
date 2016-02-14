
module.exports = function (conf) {

	var fs = require('fs');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var spawn = require('child_process').spawn;
	var path = require('path');
	var Joi = require('joi');

	var transferitem = Joi.object().keys({
		path: Joi.string().required(), 
		status: Joi.boolean().required()
	});

	var parameter = Joi.object().keys({
		flag: Joi.string().allow(''),
      	name: Joi.string().allow('')
	});

	var Joijobstatus = Joi.object().keys({
			jobid: Joi.number().integer().required(),
			status: Joi.string().required(),
			downloadstatus: Joi.optional(),
			uploadstatus: Joi.optional()
		});
		

	var Job = Joi.object().keys({
			_id: Joi.string().alphanum().required(),
			_rev: Joi.optional(),
			type: Joi.string().required(),
			userEmail: Joi.string().email().required(),
			timestamp: Joi.date().required(),
			executable: Joi.string().required(),
			parameters: Joi.array().items(parameter).min(1),
			jobstatus: Joi.optional(),
			inputs: Joi.optional(),
			outputs: Joi.optional(),
			_attachments: Joi.optional()
	    });

	var handler = {};

	handler.submitJob = function(doc, cwd){

		Joi.assert(doc, Job);

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

		Joi.assert(doc.jobstatus, Joijobstatus);

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