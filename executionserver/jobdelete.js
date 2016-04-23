
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
var cwd = path.join(conf.storagedir, jobid);

try{
    var stats = fs.statSync(cwd);
    if(stats.isDirectory()){
        try{
            fs.unlinkSync(cwd);
            console.log("Job", jobid, "working directory deleted");
        }catch(e){
            console.error(e);
            process.exit(1);
        }
    }
    
}catch(e){
    console.log("Directory was deleted before.")
}

process.exit();