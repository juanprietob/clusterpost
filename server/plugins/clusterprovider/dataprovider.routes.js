
module.exports = function (server, conf) {
	
	var handlers = require('./dataprovider.handlers')(server, conf);
	var Joi = require('joi');

	var input = Joi.object().keys({
		flag: Joi.string().required(),
      	name: Joi.string().required()
	});

	var output = Joi.object().keys({
		flag: Joi.string().required(), 
      	name: Joi.string(),
	}).xor('name', 'directory');

	server.route({
		path: '/dataprovider/',
		method: 'POST',
		config: {
			handler: handlers.createJob,
			validate: {
				query: false,
		        payload: Joi.object().keys({
		          type: Joi.string().required(),
		          executable: Joi.string().required(),
		          userEmail: Joi.string().required(), 
		          inputs: Joi.array().items(input).min(1),
		          outputs: Joi.array().items(output).min(1)
		        }),
		        params: false
			},
			description: 'This route will be used to post job documents to the couch database.'
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
		        }
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
			    }
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
			    	name: Joi.string().alphanum().required()
			    }
			},
			description: 'Get a specific attachment of the document posted to the database.'
	    }
	});

}