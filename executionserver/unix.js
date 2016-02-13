
module.exports = function (conf) {

	var fs = require('fs');
	var Promise = require('bluebird');
	var _ = require("underscore");
	var spawn = require('child_process').spawn;
	var path = require('path');

	var handler = {};

	handler.submitJob = function(doc, cwd){		

		var command = doc.executable;
		var inputs = doc.inputs;
		var outputs = doc.outputs;
		var flags = doc.flags;

		var params = [];

		if(flags){
			for(var i = 0; i < flags.length; i++){
				params.push(flags[i]);
			}
		}

		if(inputs){
			for(var i = 0; i < inputs.length; i++){
				var input = inputs[i];
				if(input.flag){
					params.push(input.flag);
				}
				if(input.name){
					params.push(input.name);
				}
			}
		}

		if(outputs){
			for(var i = 0; i < outputs.length; i++){
				var output = outputs[i];
				if(output.flag){
					params.push(output.flag);
				}
				if(output.name){
					params.push(output.name);
				}
			}
		}

		const runcommand = spawn(command, params, {
			cwd: cwd
		});

		var alldata = "";
		runcommand.stdout.on('data', function(data){
			alldata += data;
		});

		var allerror = "";
		runcommand.stderr.on('data', function(data){
			allerror += data;
		});

		runcommand.on('close', function(code){
			fs.writeFile(path.join(cwd, doc._id + ".out"), alldata);
			fs.writeFile(path.join(cwd, doc._id + ".err"), allerror);
			fs.writeFile(path.join(cwd, doc._id + ".status"), code);
		});
		return true;
	}

	return handler;
}