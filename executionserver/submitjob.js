var request = require('request');
var fs = require('fs');
var _ = require('underscore');

var jobid = undefined;
var force = false;
for(var i = 0; i < process.argv.length; i++){
    if(process.argv[i] == "-j"){
        jobid = process.argv[i+1];
    }else if(process.argv[i] == "-f"){
        force = true;
    }
}

var help = function(){
    console.error("help: To execute the program you must specify the job id. ")
    console.error(process.argv[0] + " " + process.argv[1] + " -j <jobid>");
    console.error("To configure the couchdb, check conf.*.json");
    console.error("Options:");
    console.error("-f  force job submission;");
}

if(!jobid){
    help();
    return 1;
}

const getConfigFile = function (base_directory) {
  try {
    // Try to load the user's personal configuration file
    return require(base_directory + '/conf.my.json');
  } catch (e) {
    // Else, read the default configuration file
    return require(base_directory + '/conf.json');
  }
};

var conf = getConfigFile("./");

var executionmethods = require('./executionserver.methods')(conf);

var options = {
  uri: executionmethods.getDataProvider() + "/" + jobid
}

var clusterengine = require("./" + conf.engine)(conf);

request(options, function(err, res, body){
    if(err){
        console.error(err);
        return 1;
    }
    var doc = JSON.parse(body);
    var cwd = executionmethods.createDirectoryCWD(doc);

    const submitJob = function(subdoc){
        return executionmethods.getAllDocumentInputs(subdoc, cwd)
            .bind({})
            .then(function(inputs){
                this.downloadstatus = inputs;
                return clusterengine.submitJob(subdoc, cwd);
            })
            .then(function(jobstatus){
                doc.jobstatus = jobstatus;
                _.extend(doc.jobstatus, this);
                return executionmethods.uploadDocumentDataProvider(subdoc);
            });
    }

    if(doc.jobstatus){
        clusterengine.getJobStatus(doc)
        .then(function(status){
            if(status.status === doc.jobstatus.status){
                return doc.jobstatus;
            }else{
                return status;
            }
        })
        .then(function(status){
            if(status.status !== 'RUN' && force){
                if(doc.jobstatus.uploadstatus){
                    delete doc.jobstatus.uploadstatus;
                }
                return submitJob(doc);
            }
            return status;
        })
        .then(console.log)
        .catch(console.error);

    }else{
        submitJob(doc)
        .then(console.log)
        .catch(console.error);
    }
    
});