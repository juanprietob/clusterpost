module.exports = function (server, conf) {
	
	var crontab = require('node-crontab');
	var _ = require('underscore');
	var Promise = require('bluebird');
	
	var counter = 0;
	var jobId = crontab.scheduleJob("*/30 * * * *", function(){

		console.log("Running cronprovider service for running jobs...")

		console.log("Retrieving runnnig jobs...");		

		var view = "_design/searchjob/_view/jobstatus?key=" + JSON.stringify('RUN');
	    server.methods.clusterprovider.getView(view)
	    .then(function(docs){
	    	var docs = _.pluck(docs, "value");
	    	return Promise.map(docs, server.methods.executionserver.jobstatus)
	    	.then(function(jobstatus){
		    	_.each(jobstatus, function(jst, i){
		    		if(jst.status !== 'RUN'){
		    			console.log("Job: ", docs[i]._id, ",", jst.status, "owner:", docs[i].userEmail);
		    		}
		    	});
		    });
	    })
	    .catch(console.error);

	});


}