
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
    console.error("To configure the couchdb, check conf.*.json")
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

const allUpload = function(allupload){
    return executionmethods.getDocument(jobid)
    .then(function(docupdated){

        docupdated.jobstatus.uploadstatus = allupload;
        var alluploadstatus = true;
        for(var i = 0; i < allupload.length; i++){
            if(!allupload[i].ok){
                alluploadstatus = false;
            }
        }
        if(alluploadstatus){
            docupdated.jobstatus.status = "DONE";
        }
        
        return docupdated;
    })
    .then(function(doc){
        return executionmethods.uploadDocumentDataProvider(doc);
    });
}

executionmethods.getDocument(jobid)
.then(function(doc){    
    if(doc.jobstatus.status === "UPLOADING" || doc.jobstatus.status === "DONE"){
        return executionmethods.checkAllDocumentOutputs(doc)
        .then(allUpload);
    }else{        
        return clusterengine.getJobStatus(doc)
        .then(function(status){
            if(status.status === 'DONE' || status.status === 'EXIT'){
                doc.jobstatus.status = "UPLOADING";
                //Set the new status
                return executionmethods.uploadDocumentDataProvider(doc)
                    .then(function(res){
                        //update revision
                        doc._rev = res.rev;
                        return doc;
                    })
                    .then(function(doc){
                        //upload all outputs
                        return executionmethods.setAllDocumentOutputs(doc)
                    })
                    .then(allUpload);
            }
            return status;
        });
    }    
})
.then(console.log)
.catch(console.error)