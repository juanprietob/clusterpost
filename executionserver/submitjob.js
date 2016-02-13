var request = require('request');
var fs = require('fs');

var jobid = undefined;
for(var i = 0; i < process.argv.length; i++){
    if(process.argv[i] == "-j"){
        jobid = process.argv[i+1];
    }
}

var help = function(){
    console.error("help: To execute the program you must specify the job id. ")
    console.error(process.argv[0] + " " + process.argv[1] + " -j <jobid>");
    console.error("To configure the couchdb, check conf.*.json")
}

if(!jobid){
    help();
    return -1;
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
  uri: executionmethods.getCouchDBServer() + "/" + jobid
}

var clusterengine = require("./" + conf.engine)(conf);

request(options, function(err, res, body){
    if(err){
        console.error(err);
        return 1;
    }
    var doc = JSON.parse(body);
    var cwd = executionmethods.createDirectoryCWD(doc);
    
    executionmethods.getAllDocumentInputs(doc, cwd)
    .bind({})
    .then(function(inputs){
        this.transferstatus = inputs;
        return clusterengine.submitJob(doc, cwd);
    })
    .then(function(jobstatus){
        this.jobstatus = jobstatus;
        return this;
    })
    .then(console.log)
    .catch(console.error)
});