var request = require('request');
var fs = require('fs');
var _ = require('underscore');

var jobid = undefined;
for(var i = 0; i < process.argv.length; i++){
    if(process.argv[i] == "-j"){
        jobid = process.argv[i+1];
    }
}

var help = function(){
    console.error("help: To execute the program you must specify the job id. ")
    console.error(process.argv[0] + " " + process.argv[1] + " -j <jobid>");
    console.error("To configure data provider check conf.*.json")
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

var clusterengine = require("./" + conf.engine)(conf);

executionmethods.getDocument(jobid)
.then(function(doc){
    if(doc.jobstatus && doc.jobstatus.status === "RUN"){

        return clusterengine.killJob(doc)
            .then(function(status){
                doc.jobstatus.status = status.status;
                executionmethods.uploadDocumentDataProvider(doc)
                .then(function(){
                    return status;
                });
            });
        
    }else{
        return {
            status: 'READY'
        };
    }
})
.then(console.log)
.catch(console.error)