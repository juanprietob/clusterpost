
module.exports = function (conf) {

	var fs = require('fs');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var spawn = require('child_process').spawn;
	var path = require('path');
	var Joi = require('@hapi/joi');
	const { ECSClient, ListClustersCommand, RunTaskCommand, DescribeTasksCommand, StopTaskCommand } = require("@aws-sdk/client-ecs");


	var executionmethods = require('./executionserver.methods')(conf);
	var clustermodel = require('clusterpost-model');

	var handler = {};

	handler.submitJob = function(doc, cwd){

		Joi.assert(doc, clustermodel.job);
		var jobid = doc._id;
		console.log("Job ID: " + jobid);
		console.log("URI: " + conf.uri);
		console.log("Token: " + conf.token);
		return new Promise(function(resolve, reject){
			// var command = 'aws';
			// //aws ecs create-service --cluster fly-by-cnn --service-name fly-by-cnn-service --task-definition fly-by-docker:4 --desired-count 1 --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[subnet-0c8cf4101362bdd63],securityGroups=[sg-042c3b29e1aa0a65c],assignPublicIp=ENABLED}"
			// var parameters = ['ecs', 'run-task', '--cluster', 'fly-by-cnn', '--task-definition',
			// 		 'fly-by-docker:4', '--launch-type', 'FARGATE', '--network-configuration',
			// 		  'awsvpcConfiguration={subnets=[subnet-0c8cf4101362bdd63],securityGroups=[sg-042c3b29e1aa0a65c],assignPublicIp=ENABLED}',
			// 		  '--overrides', 'containerOverrides={name=fly-by-docker-con, command=[echo ' + jobid + ']}'
			// 		];

			// Set the AWS region
			const REGION = "us-east-1";

			// Create an S3 client service object
			const ecs = new ECSClient({ region: REGION });

			//--cluster fly-by-cnn --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[subnet-0c8cf4101362bdd63],securityGroups=[sg-042c3b29e1aa0a65c],assignPublicIp=ENABLED}" --task-definition fly-by-docker:4 --overrides "containerOverrides={name=fly-by-docker-con, command=[echo something]}"

			const params = {
			  cluster: "dsci-cluster",
			  launchType: "FARGATE",
			  taskDefinition: "imgsize:1",
			  networkConfiguration: {
			      awsvpcConfiguration :
			      {
			        subnets: ["subnet-03fffa45fdc3f92f0"],
			        securityGroups: ["sg-02e3642913a4a28b2"],
			        assignPublicIp: "ENABLED"
			      }
			  },
			  overrides: {
			      containerOverrides:
			      [
			        {
			          name: "imgsize-con",
			          command: ["cpex -f --j " + jobid + " --submit --uri " + conf.uri + " --token " + conf.token + " && pwd && ls && ls " + jobid + " && " + "cpex -f --j " + jobid + " --status --uri " + conf.uri + " --token " + conf.token]
			        }
			      ]
			  },
			  tags: [
			  	{
			  		key: "cs_jobid",
			  		value: jobid
			  	}
			  ]
			};

			ecs
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
						reject(
				    	{
				    		status: "FAIL",
				    		error: 'TASK status: ' + status + ' Number of ECS failures: ' + data.failures.length
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

			const REGION = "us-east-1";

			// Create an ECS client service object
			const ecs = new ECSClient({ region: REGION });

			const params = {
			  cluster: "dsci-cluster",
			  tasks: [ taskArn ]
			};

			ecs
				.send(new DescribeTasksCommand(params))
				.then( data => {
					console.log(data.tasks.length)
					console.log(data.failures.length)
					if(data.tasks.length > 0 ){
						console.log(data.tasks[0].lastStatus);
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
	}

	handler.killJob = function(doc){

		Joi.assert(doc.jobstatus, clustermodel.jobstatus);

		return new Promise(function(resolve, reject){

			var taskArn = doc.jobstatus.jobid;

			const REGION = "us-east-1";

			// Create an ECS client service object
			const ecs = new ECSClient({ region: REGION });

			const params = {
			  cluster: "dsci-cluster",
			  task: taskArn
			};

			ecs
				.send(new StopTaskCommand(params))
				.then( data => {
					if(typeof data.task !== 'undefined'){
						var lastStatus = data.task.lastStatus;
						if(lastStatus != 'STOPPED'){
							reject({
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
				    reject({
				    	status: "FAIL",
				    	error: error
				  	  }
					);
				});


		});

	}
	return handler;
}
