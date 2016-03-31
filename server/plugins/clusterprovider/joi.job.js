module.exports = function (Joi) {

	var joijob = {};

	joijob.parameter = Joi.object().keys({
		flag: Joi.string().allow(''),
      	name: Joi.string().allow('')
	});

	joijob.output = Joi.object().keys({
		type: Joi.string().valid('file', 'directory'), 
      	name: Joi.string()
	});

	joijob.input = Joi.object().keys({
      	name: Joi.string(),
      	remote : Joi.object().keys({
      		serverCodename: Joi.string().optional(),
      		uri: Joi.string()
      	}).optional()
	});

	joijob.jobpost = Joi.object().keys({
			type: Joi.string().required(),
			userEmail: Joi.string().required(),			
			executionserver: Joi.string().required(),
			jobparameters: Joi.array().items(joijob.parameter).optional(),
			executable: Joi.string().required(),			
			parameters: Joi.array().items(joijob.parameter).min(1),
			inputs: Joi.array().items(joijob.input).min(1),
			outputs: Joi.array().items(joijob.output).min(1)
        });

	joijob.jobstatus = Joi.object().keys({
			status: Joi.string().valid('CREATE', 'DOWNLOADING', 'RUN', 'FAIL', 'KILL', 'UPLOADING', 'EXIT', 'DONE'),
			jobid: Joi.number().optional(),
			stat: Joi.optional(),
			error: Joi.optional(),
			downloadstatus: Joi.array().items(Joi.object()).optional(),
			uploadstatus: Joi.array().items(Joi.object()).optional()
		});

	joijob.job = Joi.object().keys({
			_id: Joi.string().alphanum().required(),
			_rev: Joi.string().required(),
			type: Joi.string().required(),
			userEmail: Joi.string().email().required(),
			timestamp: Joi.date().required(),
			jobstatus: joijob.jobstatus.required(),
			executable: Joi.string().required(),
			executionserver: Joi.string().required(),
			jobparameters: Joi.optional(),
			parameters: Joi.array().items(joijob.parameter).min(1),			
			inputs: Joi.array().items(joijob.input).min(1),
			outputs: Joi.array().items(joijob.output).min(1),
			_attachments: Joi.optional()
	    });

	return joijob;
}