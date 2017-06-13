
module.exports = function (conf) {

	var fs = require('fs');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var spawn = require('child_process').spawn;
	var path = require('path');
	var Joi = require('joi');

	var executionmethods = require('./executionserver.methods')(conf);
	var clustermodel = require('clusterpost-model');
	var parseString = require('xml2js').parseString;

	var handler = {};

	const getXmlJs = function(xml){
		return new Promise(function(resolve, reject){			
			parseString(xml, function(err, result){
				if(err){
					reject(err)
				}else{
					resolve(resolve);
				}
			})
		})
	}

	handler.submitJob = function(doc, cwd){

		Joi.assert(doc, clustermodel.job);

		return new Promise(function(resolve, reject){

			var command = "qsub";
			var parameters = doc.parameters;
			var scriptfilename = "script.pbs";

			var params = [];
			if(doc.jobparameters){
				params = doc.jobparameters;
			}

			params.push({
				flag: "-d",
				name: cwd
			});
			params.push({
				flag: "-e",
				name: "stderr.err"
			});
			params.push({
				flag: "-o",
				name: "stdout.out"
			});
			params.push({
				flag: "-M",
				name: doc.userEmail
			});

			var jobname;
			if(doc.name){
				jobname = doc.name;
			}else{
				jobname = doc.userEmail;
			}

			params.push({
				flag: "-N",
				name: jobname
			});

			var script = "#!/bin/bash\n####  PBS preamble\n";			

			var preamble = _.map(params, function(param){
				return _.compact([param.flag, param.name]).join(" ");
			}).join("\n#PBS ");
			
			script += "#PBS " + preamble + "\n";
			script += "####  End PBS preamble\n";


			script += doc.executable;

			if(parameters){
				script += " " + _.map(parameters, function(param){
					return _.compact([param.flag, param.name]).join(" ");
				}).join(" ");
			}
			
			fs.writeFileSync(path.join(cwd, scriptfilename), script);

			try{
				const runcommand = spawn(command, ["script.pbs"]);

				var allerror = "";
				runcommand.stderr.on('data', function(data){
					allerror += data;
				});

				var alldata = "";
				runcommand.stdout.on('data', function(data){
					alldata += data;
				});

				//"sample: Job <898104> is submitted to default queue <day>"
				runcommand.on('close', function(code){
					if(code){
						resolve({
							status: 'FAIL',
							error: allerror + alldata
						});
					}else{
						
						try{
							var jobid = alldata.split('.')[0];

							resolve({
								jobid : Number.parseInt(jobid),
								status: 'RUN'
							});
						}catch(e){
							reject({								
								status: 'FAIL',
								error: allerror,
								stat: alldata
							});
						}
	     				
					}
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

		Joi.assert(doc.jobstatus, clustermodel.jobstatus);
		Joi.assert(doc.jobstatus.jobid, Joi.number().required(), "Please execute the job first.");		

		return new Promise(function(resolve, reject){

			try{

				var jobid = doc.jobstatus.jobid;
				
				var params = ["-x", jobid];

				const ps = spawn('qstat', params);

				var allerror = "";
				ps.stderr.on('data', function(data){
					allerror += data;
				});

				var alldata = "";
				ps.stdout.on('data', function(data){
					alldata += data;
				});

				ps.on('close', function(code){

					if(alldata.indexOf("Unknown Job Id Error") !== -1){
						return {						
							status: 'DONE', 
							stat: alldata
						}
					}else{
						getXml(alldata)
						.then(function(jsonstat){
							if(jsonstat && jsonstat.Data && jsonstat.Data.Job){
								var job = jsonstat.Data.Job;
								if(job.job_state === "C" || job.job_state === "E"){
									return {
										status: 'DONE',
										stat: jsonstat
									};
								}else{
									return {
										jobid: jobid,
										status: 'RUN',
										stat: jsonstat
									};
								}
							}else{
								return {
									status: 'FAIL',
									stat: jsonstat
								};
							}
						})
						.catch(function(e){

							return {
								status: 'FAIL',
								error: e, 
								stat: alldata
							}
						})
						.then(resolve)
						.catch(reject);
					}
				});

			}catch(e){
				reject(e);
			}
			
		});
	}

	handler.killJob = function(doc){

		Joi.assert(doc.jobstatus, clustermodel.jobstatus);

		return new Promise(function(resolve, reject){

			try{

				var jobid = doc.jobstatus.jobid;
				var params = [jobid];

				const kill = spawn('qdel', params);

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
						status: 'EXIT',
						stat: allerror + alldata
					});
				});


			}catch(e){
				reject(e);
			}
			
		});

	}

	return handler;
}
