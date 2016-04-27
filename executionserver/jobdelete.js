
var fs = require('fs');
var path = require('path');

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

var cwd = path.join(conf.storagedir, jobid);

try{
    executionmethods.deleteFolderRecursive(cwd);
    var compressed = cwd + ".tar.gz";
    var compressedstat;
    try{
        compressedstat = fs.statSync(compressed);
    }catch(e){
        //does not exist
        compressedstat = undefined;
    }
    if(compressedstat){
        fs.unlinkSync(compressed);
    }
    process.exit();
}catch(e){
    console.error(e);
    process.exit(1);
}