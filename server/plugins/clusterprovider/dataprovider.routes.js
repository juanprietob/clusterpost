
module.exports = function (server, conf) {
	
	var handlers = require('./dataprovider.handlers')(server, conf);
	var Joi = require('joi');

	var joijob = require('./joi.job')();

	server.route({
		path: '/dataprovider',
		method: 'POST',
		config: {
			handler: handlers.createJob,
			validate: {
				query: false,
		        payload: joijob.jobpost,
		        params: false
			},
			payload:{
				output: 'data'
			},
			description: 'This route will be used to post job documents to the couch database.'
		}
	});

	server.route({
		path: '/dataprovider',
		method: 'PUT',
		config: {
			handler: handlers.updateJob,
			validate: {
				query: false,
		        payload: joijob.job,
		        params: false
			},
			payload:{
				output: 'data'
			},
			description: 'This route will be used to update a job document in the couch database.'
		}
	});

	server.route({
		method: 'PUT',
		path: "/dataprovider/{id}/{name}",
		config: {
			handler: handlers.addData,
	      	validate: {
		      	query: false,
		        params: {
		        	id: Joi.string().alphanum().required(),
		        	name: Joi.string().required()
		        },
		        payload: true
		    },
		    payload: {
	        	maxBytes: 1024 * 1024 * 1024,
	    		output: 'stream'
	        },
		    description: 'Add attachment data'
	    }
	});
	

	server.route({
		method: 'GET',
		path: "/dataprovider/{id}",
		config: {
			handler: handlers.getJob,
			validate: {
			  	query: false,
			    params: {
			    	id: Joi.string().alphanum().required()
			    }, 
			    payload: false
			},
			response: {
				schema: joijob.job
			},
			description: 'Get the job document posted to the database'
	    }
	});

	server.route({
		method: 'GET',
		path: "/dataprovider/user",
		config: {
			handler: handlers.getUserJobs,
			validate: {
			  	query: Joi.object().keys({
			  		userEmail: Joi.string().email().required(),
			  		jobstatus: Joi.string().optional(),
			  		executable: Joi.string().optional()
			  	}), 
			  	params: false
			},
			response: {
				schema: Joi.array().items(joijob.job).min(0)
			},
			description: 'Get the jobs posted to the database for a user.'
	    }
	});

	server.route({
		method: 'GET',
		path: "/dataprovider/{id}/{name}",
		config: {
			handler: handlers.getJob,
			validate: {
			  	query: false,
			    params: {
			    	id: Joi.string().alphanum().required(),
			    	name: Joi.string().required()
			    },
			    payload: false
			},
			description: 'Get a specific attachment of the document posted to the database.',
      		cache : { expiresIn: 60 * 30 * 1000 }
	    }
	});

}
