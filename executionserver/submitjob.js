

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

var clusterengine = require("./" + conf.engine)(conf);

executionmethods.getDocument(jobid)
.then(function(doc){    
    
    var cwd = executionmethods.createDirectoryCWD(doc);

    const submitJob = function(subdoc){        
        return executionmethods.getAllDocumentInputs(subdoc, cwd)
            .bind({})
            .then(function(downloadstatus){                
                this.downloadstatus = downloadstatus;
                var isago = true;
                for(var i = 0; i < downloadstatus.length; i++){
                    if(!downloadstatus[i].status){
                        isago = false;
                    }
                }
                if(isago){                    
                    return clusterengine.submitJob(subdoc, cwd)
                    .catch(function(e){
                        return e;
                    });
                }
                return {
                    status: "DOWNLOADING",
                    error: 'Unable to retrieve all the input data'
                }
                
            })
            .then(function(jobstatus){                
                subdoc.jobstatus = jobstatus;
                _.extend(subdoc.jobstatus, this);                
                return executionmethods.uploadDocumentDataProvider(subdoc);
            });

    }

    var sjprom;
    
    if (doc.jobstatus.status === 'CREATE' || doc.jobstatus.status === 'DOWNLOADING' || doc.jobstatus.status === 'FAIL'){
        sjprom = submitJob(doc);        
    } else {
        sjprom = clusterengine.getJobStatus(doc)
        .then(function(status){
            if(status.status !== 'RUN' && force){
                if(doc.jobstatus.uploadstatus){
                    delete doc.jobstatus.uploadstatus;
                }
                return submitJob(doc);
            }
            doc.jobstatus = status;
            return executionmethods.uploadDocumentDataProvider(doc);
        })
        .catch(function(e){
            return e;
        });
    }

    return sjprom;
    
    
})
.then(console.log)
.catch(console.error);