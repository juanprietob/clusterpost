module.exports = function (server, conf) {
	
	var crontab = require('node-crontab');
	var _ = require('underscore');
	var Promise = require('bluebird');
	
	var counter = 0;
	var jobId = crontab.scheduleJob("0 0 * * *", function(){

		var view = "_design/searchjob/_view/jobstatus?key=" + JSON.stringify('RUN');
	    server.methods.clusterprovider.getView(view, false)
	    .then(function(docs){
	    	var docs = _.pluck(docs, "value");
	    	return Promise.map(docs, server.methods.executionserver.jobstatus);
	    })
	    .then(function(runningjobstatus){
	    	console.log(runningjobstatus);
	    })
	    .catch(console.error);

	});


}