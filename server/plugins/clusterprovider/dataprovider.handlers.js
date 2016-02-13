var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var Hapi = require('hapi');
var Boom = require('boom');
var spawn = require('child_process').spawn;

module.exports = function (server, conf) {
	

	var handler = {};
	/*
	*/
	handler.createJob = function(req, rep){
		
		var job = req.payload;
		job.timestamp = new Date();

		server.methods.clusterprovider.uploadDocumentsDataProvider(job)
		.then(rep)
		.catch(rep);
		
	}

	/*
	*/
	handler.addData = function(req, rep){
		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.addDocumentAttachment(doc, req.params.name, req.payload.file);
		})
		.then(rep)
		.catch(rep);
	}

	/*
	*/
	handler.getJob = function(req, rep){
		
		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			if(req.params.name){
				return server.methods.clusterprovider.getDocumentAttachment(doc, req.params.name)
			}
			return doc;
		})
		.then(rep)
		.catch(rep);
		
	}

	return handler;
}
