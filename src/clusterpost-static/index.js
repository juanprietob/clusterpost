const fs = require('fs');
const path = require('path');

exports.register = function (server, options, next) {
	server.path(__dirname);
	
	server.route({
		path: '/',
		method: '*',
		handler: function (request, reply) {
			reply.redirect('/public');
		}
	});

	server.route({
		path: '/public/{path*}',
		method: 'GET',
		config: {
			handler: {
				directory: { path: './clusterpost-public/build', listing: false, index: true }
			},
			description: 'This route serves the static website of clusterpost.'
		}
	});

    next();
};

exports.register.attributes = {
    pkg: require('./package.json')
};