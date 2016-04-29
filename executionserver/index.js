
var _ = require('underscore');
var argv = require('minimist')(process.argv.slice(2));


var submit = argv["submit"];
var jobid = argv["j"];
var force = argv["f"];

console.log(argv)

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
var jobsubmit = require("./submitjob");

var executionmethods = require('./executionserver.methods')(conf);
var clusterengine = require("./" + conf.engine)(conf);


executionmethods.getDocument(jobid)
.then(function(doc){ 

	if(submit){
		return jobsubmit(doc, force, conf);
	}
    
    
})
.then(function(res){
    console.log(res);
    process.exit();
})
.catch(function(error){
    console.error(error);
    process.exit(1);
});