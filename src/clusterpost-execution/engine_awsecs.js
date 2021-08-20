
module.exports = function (conf) {

	var fs = require('fs');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var spawn = require('child_process').spawn;
	var path = require('path');
	var Joi = require('@hapi/joi');

	const { ECSClient, ListClustersCommand, RunTaskCommand, DescribeTasksCommand, StopTaskCommand, DescribeClustersCommand } = require("@aws-sdk/client-ecs");
	const { AutoScalingClient, UpdateAutoScalingGroupCommand} = require("@aws-sdk/client-auto-scaling");


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
					console.log("Found at least one registered container instance count")
					params = conf.aws_params_gpu;
					console.log("Returning parameters")
					return params;
				}else{
					const params = {
					  AutoScalingGroupName : conf.aws_autoscalinggroup,
					  DesiredCapacity : 2 //switch on the cluster
					}
					try{
						const autoscaling = new AutoScalingClient({ region: conf.aws_region });
						autoscaling.send(new UpdateAutoScalingGroupCommand(params));
						return Promise.delay(6000)
						.then(()=>{
							return gpuInstanceIsReady(ecs, conf);
						})
					}
					catch (error){
						console.log('Error switching on the GPU cluster')
						console.log(error)
					}
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
				//console.log("Software: " + JSON.stringify(software[0]));

				var taskDefinition = software[0].name.toLowerCase();
				var container_name = software[0].name.toLowerCase() + "-con";
				var need_gpu = false;
				if (software[0].gpu != undefined && software[0].gpu == true)
				{
					console.log("This job needs a GPU.")
					need_gpu = true;
				}

				//console.log("Task Definition: " + taskDefinition + " Container name: " + container_name );
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
					console.log("GOT GPU PARAMETERS!!");
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
						console.log("Will now send the runtask commamd");
						return ecs
						.send(new RunTaskCommand(params))
						.then( data => {
							console.log("Got the data back from runtaskcommand")
							if(data.tasks.length > 0 ){
								console.log(data.tasks[0].lastStatus);
								var status = data.tasks[0].lastStatus;
								console.log('In SUBMITJOB: Task status: ' + status)
								console.log("In SUBMITJOB: Number of failures: " + data.failures.length)
								if(['PROVISIONING', 'PENDING', 'ACTIVATING', 'RUNNING'].indexOf(status) >= 0 &&
									data.failures.length == 0){
									console.log("In SUBMITJOB: making the status as RUN")
									resolve( {
										jobid : data.tasks[0].taskArn,
										//taskArn : data.tasks[0].taskArn,
										status: "RUN"
									});
								}
								else{
									console.log("In SUBMITJOBm setting the status to FAIL?")
									resolve({
							    		status: "FAIL",
							    		error: 'TASK status: ' + status + ' Number of ECS failures: ' + data.failures.length
							    	});
								}
							}
							else{
								console.log("Number of tasks returned 0 ");
								console.log(params)
								resolve(
								{
									status: "QUEUE",
									stat: "Submitted, but waiting"
								});
							}
						})
					}
				})
				.catch((error) => {
					console.log("In SUBMITJOB, there was an error: ")
				    console.error(error);
				    resolve({
				    	status: "FAIL",
				    	error: error
				  	  });
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
				console.log("TaskARN is empty");
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
					console.log("In GETJOBSTATUS: PARAMS (for describetask) now is: ");
					console.log(params);

					ecs
						.send(new DescribeTasksCommand(params))
						.then( data => {
							if(data.tasks.length > 0 ){
								console.log("In GETJOBSTATUS : number of tasks: ", data.tasks.length)
								console.log(" In GETJOBSTATUS : ECS Task last status: ", data.tasks[0].lastStatus);
								var lastStatus = data.tasks[0].lastStatus;
								if(['PROVISIONING', 'PENDING', 'ACTIVATING', 'RUNNING', 'DEACTIVATING','DEPROVISIONING'].indexOf(lastStatus) >= 0){
									console.log("In GETJOBSTATUS, will put the status as RUN")
									resolve( {
										jobid : data.tasks[0].taskArn,
										//taskArn : data.tasks[0].taskArn,
										status: "RUN",
										stat: lastStatus
									});
								}
								else if( ['STOPPING', 'STOPPED'].indexOf(lastStatus) >= 0 ){
									console.log('In GETJOBSTATUS: Found STOPPED/STOPPING in the last status, setting status to Done.');
									resolve( {
										jobid : data.tasks[0].taskArn,
										//taskArn : data.tasks[0].taskArn,
										status: "DONE",
										stat: lastStatus
									});
								}
								else{
									console.log('In GETJOBSTATUS: unknown laststatus, setting status to fail.');
									resolve( {
										jobid : data.tasks[0].taskArn,
										//taskArn : data.tasks[0].taskArn,
										status: "FAIL",
										error: 'An unknown status for the task: ' + lastStatus
									});
								}

							}
							else{
								console.log("In GETJOBSTATUS : number of tasks (should be 0): ", data.tasks.length)
								// Are there any failures?
								var error = 'Unknown';
								if(data.failures.length > 0) {
									error = data.failures[0].reason
									console.log("In GETJOBSTATUS: there was an error: ", error)
								}
								resolve({
							    		status: "FAIL",
							    		error: 'Number of ECS failures: ' + data.failures.length + ' Reason: ' + error
							    	});
							}
						})
						.catch((error) => {
						    console.error(error);
						    console.log("In GETJOBSTATUS, rejecting, error: ", error)
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
			return Promise.reject(
			{
		    	status: "FAIL",
			  	error: e
			});
		});
	}

	handler.killJob = function(doc){

		Joi.assert(doc.jobstatus, clustermodel.jobstatus);

		return new Promise(function(resolve, reject){

			var taskArn = doc.jobstatus.jobid;
			if(taskArn == undefined || taskArn.length == 0)
			{
				console.log("In KillJOB, Task is undefined");
				resolve({
					status: "FAIL",
					error: "ERROR: task is empty"
				});
			}

			console.log("In KillJOB Printing: " + taskArn);

			const REGION = conf.aws_region;

			// Create an ECS client service object
			const ecs = new ECSClient({ region: REGION });
			var software_id = doc.data.software_id;
			console.log("In kill job software id: " + software_id);

			return executionmethods.getSoftware(software_id)
				.then((software)=>{
					var need_gpu = false;
					if (software[0].gpu != undefined && software[0].gpu == true)
							need_gpu = true;

					var params = undefined;

					if(need_gpu){
						params={
							  cluster: conf.aws_params_gpu.cluster,
							  task: taskArn
							};
					}
					else{
						params={
						  cluster: conf.aws_params.cluster,
						  task: taskArn
						};
					}
					console.log("In kill job params: ");
					console.log(params);

					ecs.send(new StopTaskCommand(params))
						.then( data => {
							print(data)
							if(data.task != undefined){
								console.log("In KillJOb: stop command return: " );
								console.log(data)
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
							else{

								resolve({
										status: 'EXIT',
										stat: 'Stopping job, not found on ECS'
								});
							}
						})
						.catch((error) => {
							console.log("Got an error in Killjob");
						    console.error(error);
						    console.log("Setting status to FAIL");
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

	handler.checkGPUNodes = function(){
		return Promise.all([Promise.all([executionmethods.getJobsQueue(), executionmethods.getJobsRun()]).then((jobs)=>{ return _.flatten(jobs) }), executionmethods.getSoftware()])
		.spread((jobs, softwares)=>{

			if (jobs != undefined){
				console.log("In checkGPUNodes::  Number of jobs: ", jobs.length)
			}

			var jobs_gpu = executionmethods.splitJobsGPU(jobs, softwares).jobs_gpu;
			if(jobs_gpu.length == 0){
				console.log("IN checkGPUNodes::: number of gpu jobs is 0 will try to switch off the cluster")
				const REGION = conf.aws_region;

				// Create an ECS client service object
				const ecs = new ECSClient({ region: REGION });
				const describeClusterParameters = { clusters: [conf.aws_params_gpu.cluster], region:conf.aws_region};

				ecs.send(new DescribeClustersCommand(describeClusterParameters))
					.then( data => {
						if( data.clusters[0].registeredContainerInstancesCount > 0){
							// if empty, switch off the cluster if the number of instances running is more than 0.
							console.log("IN checkGPUNodes:: number of container instance count is more than 0, switching off the cluster")
							const params = {
							  AutoScalingGroupName : conf.aws_autoscalinggroup,
							  DesiredCapacity : 0 //switch on the cluster
							}
							try{
								const autoscaling = new AutoScalingClient({ region: conf.aws_region });
								autoscaling.send(new UpdateAutoScalingGroupCommand(params));
								return Promise.delay(6000);
							}
							catch (error){
								console.log('checkGPUNodes:: Error switching off the GPU cluster')
								console.log(error)
							}
						}
					})
			}
		})
		.catch((e)=>{
			console.error(" checkGPUNodes \n" + e);
			return Promise.reject(
			{
		    	status: "FAIL",
			  	error: e
			});
		});

	}
	return handler;
}
