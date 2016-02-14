module.exports = function (server, conf) {

	var handlers = require('./executionserver.handlers')(server, conf);
	var Joi = require('joi');
	

	server.route({
		method: 'GET',
		path: "/executionserver",
		config: {
	      handler: handlers.getExecutionServers,
	      description: 'Get execution servers code names'
	    }
	});

	server.route({
		method: 'POST',
		path: "/executionserver/{id}",
		config: {
	      handler: handlers.submitJob,
	      validate: {
	      	params: {
	      		id: Joi.string().alphanum().required()
	      	},
	      	query: false,
	      	payload: {
	      		executionserver: Joi.string().required()
	      	}
	      },
	      description: 'Submit a job to a cluster'
	    }
	});

	server.route({
		method: 'GET',
		path: "/executionserver/{id}",
		config: {
	      handler: handlers.jobStatus,
	      description: 'Update job status'
	    }
	});
}

