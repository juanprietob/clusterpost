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
		.then(function(res){
			if(res.length === 1){
				return res[0];
			}else{
				return res;
			}
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.badRequest(e));
		});
		
	}

	handler.updateJob = function(req, rep){
		server.methods.clusterprovider.uploadDocumentsDataProvider(req.payload)
		.then(rep)
		.catch(function(e){
			rep(Boom.badRequest(e));
		});
	}

	/*
	*/
	handler.addData = function(req, rep){
		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			return server.methods.clusterprovider.addDocumentAttachment(doc, req.params.name, req.payload);
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.badData(e));
		});
	}

	/*
	*/
	handler.getJob = function(req, rep){
		
		server.methods.clusterprovider.getDocument(req.params.id)
		.then(function(doc){
			if(req.params.name){
				var name = req.params.name;
				var att = _.find(doc.inputs, function(input){
					return input.name === name;
				});
				if(!att){
					att = _.find(doc.outputs, function(output){
						return output.name === name;
					});
				}
				if(!att){
					throw "Attachment not found."
				}
				return server.methods.clusterprovider.getDocumentAttachment(doc, att.name, att.remote);
			}else{
				return doc;
			}
			
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.notFound(e));
		});
		
	}

	/*
	*/
	handler.getUserJobs = function(req, rep){


		var email = req.query.userEmail;
		var jobstatus = req.query.jobstatus;
		var executable = req.query.executable;

		if(jobstatus){
			var key = [email, jobstatus];
			view = '_design/searchjob/_view/useremailjobstatus?include_docs=true&key=' + JSON.stringify(key);
		}else if(executable){
			var key = [email, executable];
			view = '_design/searchjob/_view/useremailexecutable?include_docs=true&key=' + JSON.stringify(key);
		}else{
			view = '_design/searchjob/_view/useremail?include_docs=true&key=' + JSON.stringify(email);
		}

		server.methods.clusterprovider.getView(view, true)
		.then(function(rows){
			return _.pluck(rows, 'doc');
		})
		.then(rep)
		.catch(function(e){
			rep(Boom.badRequest(e));
		})
	}

	return handler;
}
