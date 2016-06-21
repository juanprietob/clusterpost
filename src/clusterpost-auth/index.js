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

	server.register({
		register: require('hapi-jwt-couch'),
		options: conf
	}, function(err){

		if(err){
			throw err;
		}

		server.method({
			name: 'clusterpostauth.verify',
			method: server.methods.jwtauth.verify,
			options: {}
		});

	});
	
	return next();
	
};

exports.register.attributes = {
  pkg: require('./package.json')
};