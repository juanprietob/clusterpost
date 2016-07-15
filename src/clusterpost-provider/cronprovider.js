module.exports = function (server, conf) {
	
	var crontab = require('node-crontab');
	var _ = require('underscore');
	var Promise = require('bluebird');
	var os = require('os');

	var LinkedList = require('linkedlist');
	var queue = new LinkedList();
	var inqueue = {};

	const addJobToQueue = function(job){
		if(!inqueue[job._id]){
			queue.push(job._id);
			inqueue[job._id] = job;
		}
	}

	server.method({
	    name: 'cronprovider.addJobToQueue',
	    method: addJobToQueue,
	    options: {}
	});

	crontab.scheduleJob("*/1 * * * *", function(){

		var jobs = [];
		while (queue.length) {
			console.log("doing");
			var jobid = queue.shift();
			jobs.push(inqueue[jobid]);
			delete inqueue[jobid];
		}

		Promise.map(jobs, function(job){
    		return server.methods.executionserver.jobstatus(job, true);
    	}, {
    		concurrency: 1
    	})
	    .catch(console.error);
		

	});
	
	if(!server.methods.cluster || server.methods.cluster && server.methods.cluster.getWorker().id === 1){
		crontab.scheduleJob("*/10 * * * *", function(){

			var view = "_design/searchjob/_view/jobstatus?key=" + JSON.stringify('RUN');
		    server.methods.clusterprovider.getView(view)
		    .then(function(docs){
		    	var jobs = _.pluck(docs, "value");
		    	_.each(jobs, function(job){
		    		server.methods.addJobToQueue(job);
		    	});
		    })
		    .catch(console.error);

		});
	}

}