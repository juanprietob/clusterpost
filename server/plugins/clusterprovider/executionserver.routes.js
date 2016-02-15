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
	      	payload: false
	      },
	      description: 'Start job execution'
	    }
	});

	server.route({
		method: 'DELETE',
		path: "/executionserver/{id}",
		config: {
	      handler: handlers.killJob,
	      validate: {
	      	params: {
	      		id: Joi.string().alphanum().required()
	      	},
	      	query: false,
	      	payload: false
	      },
	      description: 'Kill a running job'
	    }
	});

	server.route({
		method: 'GET',
		path: "/executionserver/{id}",
		config: {
	      handler: handlers.jobStatus,
	      validate:{
	      	params: {
	      		id: Joi.string().alphanum().required()
	      	},
	      	query: false,
	      	payload: false
	      },
	      description: 'Update job status'
	    }
	});
}

