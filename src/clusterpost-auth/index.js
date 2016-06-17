var Boom = require('boom');

exports.register = function (server, conf, next) {

	const validate = function(req, decodedToken, callback){
        var exs = server.methods.executionserver.getExecutionServer(decodedToken.executionserver);
		if(exs){
			exs.scope = ['executionserver'];
			callback(undefined, true, exs);
		}else{
			callback(Boom.unauthorized(exs));
		}
	}

	conf.validate = validate;

	return require('hapi-jwt-couch').register(server, conf, next);
	
};

exports.register.attributes = {
  pkg: require('./package.json')
};