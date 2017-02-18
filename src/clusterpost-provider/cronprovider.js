module.exports = function (server, conf) {
	
	var crontab = require('node-crontab');
	var _ = require('underscore');
	var Promise = require('bluebird');
	var os = require('os');
	var LinkedList = require('linkedlist');

	var queue = new LinkedList();
	var inqueue = {};
	var retrievingJobs = false;
	
	var submitqueue = new LinkedList();
	var insubmitqueue = {};
	var submitingJobs = false;

	var deletequeue = new LinkedList();

	const addJobToUpdateQueue = function(job){
		return new Promise(function(resolve, reject){
			try{
				if(!inqueue[job._id]){
					queue.push(job._id);
					inqueue[job._id] = job;
					resolve(true);
				}
				resolve(false);
			}catch(e){
				reject(e);
			}
		});
	}

	server.method({
	    name: 'cronprovider.addJobToUpdateQueue',
	    method: addJobToUpdateQueue,
	    options: {}
	});

	const addJobToSubmitQueue = function(job, force){
		return new Promise(function(resolve, reject){
			try{
				if(!insubmitqueue[job._id]){
					submitqueue.push(job._id);
					insubmitqueue[job._id] = {
						_id: job._id, 
						executionserver: job.executionserver,
						force: force
					};
					resolve(true);
				}
				resolve(false);
			}catch(e){
				reject(e);
			}
		});
	}

	server.method({
	    name: 'cronprovider.addJobToSubmitQueue',
	    method: addJobToSubmitQueue,
	    options: {}
	});

	const addJobToDeleteQueue = function(job){
		return new Promise(function(resolve, reject){
			try{
				deletequeue.push(job);
				resolve(true);
			}catch(e){
				reject(e);
			}
		});
	}

	server.method({
	    name: 'cronprovider.addJobToDeleteQueue',
	    method: addJobToDeleteQueue,
	    options: {}
	});

	const submitJobs = function(){

		return new Promise(function(resolve, reject){

			if(!submitingJobs && submitqueue.length > 0){

				submitingJobs = true;
				var jobs = [];
				
				while (submitqueue.length) {
					var jobid = submitqueue.shift();
					jobs.push(insubmitqueue[jobid]);
				}
				
				Promise.map(jobs, function(job){
		    		return server.methods.executionserver.submitJob(job)
		    		.then(function(res){
		    			delete insubmitqueue[job._id];
		    			return res;
		    		})
		    		.catch(function(e){
		    			console.error("Error while submitting job", job._id, e);
		    			return e;
		    		});
		    	}, {
		    		concurrency: 1
		    	})
		    	.then(function(res){
		    		submitingJobs = false;
		    		resolve(res);
		    	})
			    .catch(function(e){
			    	submitingJobs = false;
			    	console.error(e);
			    	reject(e);
			    });

				
			}else{
				return resolve(false);
			}
		});
	}

	server.method({
	    name: 'cronprovider.submitJobs',
	    method: submitJobs,
	    options: {}
	});

	const updateJobsStatus = function(){

		return new Promise(function(resolve, reject){
			if(!retrievingJobs && queue.length > 0){
				var jobs = [];
				retrievingJobs = true;
				while (queue.length) {
					var jobid = queue.shift();
					jobs.push(inqueue[jobid]);
				}

				Promise.map(jobs, function(job){
		    		return server.methods.executionserver.jobStatus(job)
		    		.then(function(status){
		    			delete inqueue[job._id];
		    			return status;
		    		})
		    		.catch(function(e){
		    			console.error("Error while updating job status", job._id, e);
		    			return e;
		    		});
		    	}, {
		    		concurrency: 1
		    	})
		    	.then(function(res){
		    		retrievingJobs = false;
		    		resolve(res);
		    	})
			    .catch(function(e){
			    	retrievingJobs = false;	
			    	console.error(e);
			    	reject(e);
			    });
			}else{
				resolve(false);
			}
		});
	}

	server.method({
	    name: 'cronprovider.updateJobsStatus',
	    method: submitJobs,
	    options: {}
	});

	const deleteJobs = function () {
		
		return new Promise(function(resolve, reject){
			if(deletequeue.length > 0){
				var jobs = [];
				
				while (deletequeue.length) {
					jobs.push(deletequeue.shift());
				}

				Promise.map(jobs, function(job){
		    		return server.methods.executionserver.jobDelete(job)
		    		.catch(function(e){
				    	console.error("Error while deleting job", job._id, e);
				    	return e;
				    });
		    	}, {
		    		concurrency: 1
		    	})
		    	.then(resolve)
			    .catch(function(e){
			    	console.error(e);
			    	reject(e);
			    });
			}else{
				resolve(false);
			}
		});
	}

	server.method({
	    name: 'cronprovider.deleteJobs',
	    method: submitJobs,
	    options: {}
	});

	const retrieveRunningJobs = function(){
		var view = "_design/searchJob/_view/jobstatus?key=" + JSON.stringify('RUN');

	    return server.methods.clusterprovider.getView(view)
	    .then(function(docs){
	    	return Promise.map(_.pluck(docs, "value"), server.methods.cronprovider.addJobToUpdateQueue);
	    })
		.catch(function(e){
			console.error(e);
			return e;
		});
	}

	server.method({
	    name: 'cronprovider.retrieveRunningJobs',
	    method: retrieveRunningJobs,
	    options: {}
	});

	const retrieveQueueJobs = function(){
		var view = "_design/searchJob/_view/jobstatus?key=" + JSON.stringify('QUEUE');
		console.log("Retrieve jobs in QUEUE");
	    return server.methods.clusterprovider.getView(view)
	    .then(function(docs){
	    	return Promise.map(_.pluck(docs, "value"), server.methods.cronprovider.addJobToSubmitQueue);
	    })
	    .catch(console.error);
	}
	
	
	crontab.scheduleJob("*/1 * * * *", function(){
		submitJobs()
		.then(function(){
			return updateJobsStatus();
		})
		.then(function(){
			return deleteJobs();
		})
		.catch(console.error);
		
	});

	var cluster = server.methods.getCluster();
	
	var crontimemin = 10;

	if(cluster && cluster.worker){
		crontimemin *= cluster.worker.id;
	}
	var crontime = "*/"+crontimemin+" * * * *";

	crontab.scheduleJob(crontime, function(){
		Promise.all([retrieveQueueJobs(), retrieveRunningJobs()])
		.catch(console.error);
	});

	//Run once the retrieveQueueJobs() when starting the server
	retrieveQueueJobs()

}