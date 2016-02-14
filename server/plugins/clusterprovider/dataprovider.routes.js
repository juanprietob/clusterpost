
module.exports = function (server, conf) {
	
	var handlers = require('./dataprovider.handlers')(server, conf);
	var Joi = require('joi');

	var parameter = Joi.object().keys({
		flag: Joi.string().allow(''),
      	name: Joi.string().allow('')
	});

	var output = Joi.object().keys({
		type: Joi.string().valid('file', 'directory'), 
      	name: Joi.string()
	});

	var input = Joi.object().keys({
      	name: Joi.string(),
      	remote : Joi.object().keys({
      		serverCodename: Joi.string(),
      		uri: Joi.string()
      	}).optional()
	});

	var Job = Joi.object().keys({
			type: Joi.string().required(),
			executable: Joi.string().required(),
			executionserver: Joi.string().required(),
			parameters: Joi.array().items(parameter).min(1),
			userEmail: Joi.string().required(), 
			inputs: Joi.array().items(input).min(1),
			outputs: Joi.array().items(output).min(1)
        });

	var JobUpdate = Joi.object().keys({
			_id: Joi.string().alphanum().required(),
			_rev: Joi.optional(),
			type: Joi.string().required(),
			userEmail: Joi.string().email().required(),
			timestamp: Joi.date().required(),
			executable: Joi.string().required(),
			executionserver: Joi.string().required(),
			parameters: Joi.array().items(parameter).min(1),
			jobstatus: Joi.optional(),
			inputs: Joi.optional(),
			outputs: Joi.optional(),
			_attachments: Joi.optional()
	    });

			

	server.route({
		path: '/dataprovider',
		method: 'POST',
		config: {
			handler: handlers.createJob,
			validate: {
				query: false,
		        payload: Job,
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
		        payload: JobUpdate,
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
	        	maxBytes: 100 * 1024 * 1024,
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
			description: 'Get the job document posted to the database'
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