
var _ = require('underscore');
var argv = require('minimist')(process.argv.slice(2));


var submit = argv["submit"];
var jobid = argv["j"];
var force = argv["f"];

var status = argv["status"];

var kill = argv["kill"];

var jobdelete = argv["delete"];

var help = function(){
    console.error("help: To execute the program you must specify the job id. ")
    console.error(process.argv[0] + " " + process.argv[1] + " -j <jobid>");
    console.error("To configure the couchdb, check conf.*.json");
    console.error("Options:");
    console.error("--submit 	Submit the job.");
    console.error("-f  			force job submission");
    console.error("--status  	get job status");
    console.error("--kill  		kill job");
    console.error("--delete  	delete job");
}

if(!jobid || !submit && !status && !kill && !jobdelete){
    help();
    process.exit(1);
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

if(jobdelete){
	try{
		require("./jobdelete")(jobid, conf);
		process.exit();
	}catch(e){
        console.error(e);
        process.exit(1);
    }
}

executionmethods.getDocument(jobid)
.then(function(doc){ 

	if(submit){
		return require("./jobsubmit")(doc, force, conf);
	}else if(status){
		return require("./jobstatus")(doc, conf);
	}else if(kill){
		return require("./jobkill")(doc, conf);
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