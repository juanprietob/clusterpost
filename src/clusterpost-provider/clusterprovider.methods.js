var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Stream = require('stream');
var Boom = require('boom');

module.exports = function (server, conf) {
	
	var clustermodel = require('clusterpost-model');
	var Joi = require('joi');

	const isJobDocument = function(doc){
		Joi.assert(doc, clustermodel.job);
		return Promise.resolve(doc);
	}

	server.method({
	    name: 'clusterprovider.isJobDocument',
	    method: isJobDocument,
	    options: {}
	});
	

	const validateJobOwnership = function(doc, credentials){
		return new Promise(function(resolve, reject){
			if(doc.userEmail === credentials.email || credentials.scope.indexOf('admin') >= 0 || (credentials.scope.indexOf("executionserver") >= 0)){
				resolve(doc);
			}else{
				reject(Boom.unauthorized("You are not allowed to access this job document!"));
			}
		});
	}

	server.method({
	    name: 'clusterprovider.validateJobOwnership',
	    method: validateJobOwnership,
	    options: {}
	});
}
