var Joi = require('joi');

exports.parameter = Joi.object().keys({
	flag: Joi.string().allow(''),
  	name: Joi.string().allow('')
});

exports.output = Joi.object().keys({
	type: Joi.string().valid('file', 'directory', 'tar.gz'), 
  	name: Joi.string()
});

exports.input = Joi.object().keys({
  	name: Joi.string(),
  	remote : Joi.object().keys({
  		serverCodename: Joi.string().optional(),
  		uri: Joi.string()
  	}).optional()
});

exports.jobpost = Joi.object().keys({
		type: Joi.string().required(),
		userEmail: Joi.string().required(),			
		executionserver: Joi.string().required(),
		jobparameters: Joi.array().items(exports.parameter).optional(),
		executable: Joi.string().required(),			
		parameters: Joi.array().items(exports.parameter).min(1),
		inputs: Joi.array().items(exports.input).min(1).optional(),
		outputs: Joi.array().items(exports.output).min(1)
    });

exports.jobstatus = Joi.object().keys({
		status: Joi.string().valid('CREATE', 'DOWNLOADING', 'RUN', 'FAIL', 'KILL', 'UPLOADING', 'EXIT', 'DONE'),
		jobid: Joi.number().optional(),
		stat: Joi.optional(),
		error: Joi.optional(),
		downloadstatus: Joi.array().items(Joi.object()).optional(),
		uploadstatus: Joi.array().items(Joi.object()).optional()
	});

exports.job = Joi.object().keys({
		_id: Joi.string().alphanum().required(),
		_rev: Joi.string().required(),
		type: Joi.string().required(),
		userEmail: Joi.string().email().required(),
		timestamp: Joi.date().required(),
		jobstatus: exports.jobstatus.required(),
		executable: Joi.string().required(),
		executionserver: Joi.string().required(),
		jobparameters: Joi.optional(),
		parameters: Joi.array().items(exports.parameter).min(1),			
		inputs: Joi.array().items(exports.input).min(1).optional(),
		outputs: Joi.array().items(exports.output).min(1),
		_attachments: Joi.optional()
    });

exports.password = Joi.string().regex(/^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])[\w\d!@#$%_-]{6,40}$/);

exports.user = Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: exports.password
});

exports.login = Joi.object().keys({
    email: Joi.string().email().required(),
    password: exports.password
});
