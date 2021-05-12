
module.exports = function (conf) {

	var fs = require('fs');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var spawn = require('child_process').spawn;
	var path = require('path');
	var Joi = require('@hapi/joi');
	const { ECSClient, ListClustersCommand, RunTaskCommand, DescribeTasksCommand, StopTaskCommand, DescribeClustersCommand } = require("@aws-sdk/client-ecs");


	var executionmethods = require('./executionserver.methods')(conf);
	var clustermodel = require('clusterpost-model');

	var handler = {};

	gpuInstanceIsReady = (ecs, conf)=>{
		console.log("Getting GPU AWS parameters");


			// RUn the describeclusters command, and make sure that the registered container isntances  > 0
			const describeClusterParameters = { clusters: [conf.aws_params_gpu.cluster], region:conf.aws_region};

			return ecs.send(new DescribeClustersCommand(describeClusterParameters))
				.then( data => {
				if( data.clusters[0].registeredContainerInstancesCount > 0){
					params = conf.aws_params_gpu;
					return params;
				}else{
					return Promise.delay(6000)
					.then(()=>{
						return gpuInstanceIsReady(ecs, conf);
					})
				}
			});
			// otherwise, make the ec2 auto-scaling group increase the number of 'desired capacity' and wait for
			//
	}

	handler.submitJob = function(doc, cwd){

		Joi.assert(doc, clustermodel.job);

		var jobid = doc._id;
		var data = doc.data;
		var software_id = doc.data.software_id;

		console.log("Job ID: " + jobid);
		console.log("URI: " + conf.uri);
		console.log("Token: " + conf.token);
		console.log("Software ID: " + software_id);

		var software_name;

		return executionmethods.getSoftware(software_id)
		.then((software)=>{

			return new Promise(function(resolve, reject){

				// Set the AWS region
				const REGION = conf.aws_region;

				// Create an ECS client service object
				const ecs = new ECSClient({ region: REGION });

				console.log("Software name: " + software[0].name);
				var taskDefinition = software[0].name.toLowerCase();
				var container_name = software[0].name.toLowerCase() + "-con";
				var need_gpu = false;
				if (software[0].gpu != undefined && software[0].gpu == true)
					need_gpu = true;

				console.log("Task Definition: " + taskDefinition + " Container name: " + container_name );
				var params =undefined;


				if (need_gpu == true) {
					var is_ready = gpuInstanceIsReady(ecs, conf);
				}
				else {
					params = conf.aws_params;
					var is_ready = Promise.resolve(params);
				}

				return is_ready
				.then((params)=>{
					if(params==undefined) {
						resolve (
							{
							status : "FAIL",
							error : "Failed to assign AWS ECS parameters"
							}
						);

					}else{
						params.taskDefinition = taskDefinition;
						params.overrides.containerOverrides[0].name = container_name;
						params.overrides.containerOverrides[0].command = ["cpex -f --j " + jobid + " --submit --uri " + conf.uri + " --token " + conf.token + " && pwd && ls && ls " + jobid + " && " + "cpex -f --j " + jobid + " --status --uri " + conf.uri + " --token " + conf.token];

						return ecs
						.send(new RunTaskCommand(params))
						.then( data => {

							console.log(data.tasks[0].lastStatus);
							var status = data.tasks[0].lastStatus;
							console.log('Task status: ' + status)
							console.log("Number of failures: " + data.failures.length)
							if(['PROVISIONING', 'PENDING', 'ACTIVATING', 'RUNNING'].indexOf(status) >= 0 &&
								data.failures.length == 0){
								resolve( {
									jobid : data.tasks[0].taskArn,
									//taskArn : data.tasks[0].taskArn,
									status: "RUN"
								});
							}
							else{
								resolve(
						    	{
						    		status: "FAIL",
						    		error: 'TASK status: ' + status + ' Number of ECS failures: ' + data.failures.length
						    	}
						    	);

							}
						})
					}
				})
				.catch((error) => {
				    console.error(error);
				    resolve(
				    	{
				    	status: "FAIL",
				    	error: error
				  	  }
					);
				});

			});

		})
		.catch((e)=>{
			console.error(e);
			return Promise.reject(e);
		})

	}

	handler.getJobStatus = function(doc){

		return new Promise(function(resolve, reject){

			try{
				Joi.assert(doc.jobstatus, clustermodel.jobstatus);
				Joi.assert(doc.jobstatus.jobid, Joi.string().min(1), "Please execute the job first.");
			}
			catch(e){
				reject(e);
			}

			var taskArn = doc.jobstatus.jobid;
			if(taskArn == undefined || taskArn.length == 0)
			{
				resolve({
					status: "FAIL",
					error: "ERROR: task is empty"
				});
			}
			const REGION = conf.aws_region;

			// Create an ECS client service object
			const ecs = new ECSClient({ region: REGION });

			var software_id = doc.data.software_id;
			return executionmethods.getSoftware(software_id)
				.then((software)=>{
					var need_gpu = false;
					if (software[0].gpu != undefined && software[0].gpu == true)
							need_gpu = true;

					var params = undefined;

					if(need_gpu){
						params={
							  cluster: conf.aws_params_gpu.cluster,
							  tasks: [ taskArn ]
							};
					}
					else{
						params={
						  cluster: conf.aws_params.cluster,
						  tasks: [ taskArn ]
						};
					}
					console.log("PARAMS now is: ");
					console.log(params);

					ecs
						.send(new DescribeTasksCommand(params))
						.then( data => {
							if(data.tasks.length > 0 ){
								console.log("ECS Task last status: ", data.tasks[0].lastStatus);
								var lastStatus = data.tasks[0].lastStatus;
								if(['PROVISIONING', 'PENDING', 'ACTIVATING', 'RUNNING', 'DEACTIVATING', 'STOPPING', 'DEPROVISIONING'].indexOf(lastStatus) >= 0){
									resolve( {
										jobid : data.tasks[0].taskArn,
										//taskArn : data.tasks[0].taskArn,
										status: "RUN",
										stat: lastStatus
									});
								}
								else if( ['STOPPED'].indexOf(lastStatus) >= 0 ){
									resolve( {
										jobid : data.tasks[0].taskArn,
										//taskArn : data.tasks[0].taskArn,
										status: "DONE",
										stat: lastStatus
									});
								}
								else{
									resolve( {
										jobid : data.tasks[0].taskArn,
										//taskArn : data.tasks[0].taskArn,
										status: "FAIL",
										error: 'An unknown status for the task: ' + lastStatus
									});
								}

							}
							else{
								// Are there any failures?
								var error = 'Unknown';
								if(data.failures.length > 0) {
									error = data.failures[0].reason
								}
								resolve({
							    		status: "FAIL",
							    		error: 'Number of ECS failures: ' + data.failures.length + ' Reason: ' + error
							    	}
						    	);
							}
						})
						.catch((error) => {
						    console.error(error);
						    reject(
						    	{
						    	status: "FAIL",
						    	error: error
						  	  }
							);
						});
				});
		})
		.catch((e)=>{
			console.error(e);
			return Promise.reject(e);
		});
	}

	handler.killJob = function(doc){

		Joi.assert(doc.jobstatus, clustermodel.jobstatus);

		return new Promise(function(resolve, reject){

			var taskArn = doc.jobstatus.jobid;
			if(taskArn == undefined || taskArn.length == 0)
			{
				resolve({
					status: "FAIL",
					error: "ERROR: task is empty"
				});
			}

			const REGION = conf.aws_region;

			// Create an ECS client service object
			const ecs = new ECSClient({ region: REGION });

			var software_id = doc.data.software_id;
			return executionmethods.getSoftware(software_id)
				.then((software)=>{
					var need_gpu = false;
					if (software[0].gpu != undefined && software[0].gpu == true)
							need_gpu = true;

					var params = undefined;

					if(need_gpu){
						params={
							  cluster: conf.aws_params_gpu.cluster,
							  tasks: [ taskArn ]
							};
					}
					else{
						params={
						  cluster: conf.aws_params.cluster,
						  tasks: [ taskArn ]
						};
					}

					ecs
						.send(new StopTaskCommand(params))
						.then( data => {
							if(typeof data.task != 'undefined'){
								var lastStatus = data.task.lastStatus;
								if(lastStatus != 'STOPPED'){
									resolve({
										status: "FAIL",
										error: "Couldn't stop the ECS task, last status: " + lastStatus
									});
								}
								else{
									resolve({
										status: 'EXIT',
										stat: 'ECS stop reason: ' + data.task.stoppedReason
									});
								}
							}
						})
						.catch((error) => {
						    console.error(error);
						    resolve({
						    	status: "FAIL",
						    	error: error
						  	  }
							);
						});


				});
		})
		.catch((e)=>{
			console.error(e);
			return Promise.reject(e);
		});
	}
	return handler;
}
